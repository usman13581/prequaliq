'use strict';

/** Private 1:1 Q&A threads per supplier within a procedure */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('procedure_qa_messages', 'threadSupplierId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('procedure_qa_messages', ['procedureId', 'threadSupplierId'], {
      name: 'procedure_qa_messages_procedure_thread_idx'
    });

    // Backfill: supplier-authored messages belong to that supplier's thread
    await queryInterface.sequelize.query(`
      UPDATE procedure_qa_messages AS m
      SET "threadSupplierId" = s.id
      FROM suppliers AS s
      WHERE m."authorRole" = 'supplier'
        AND m."authorUserId" = s."userId"
        AND m."threadSupplierId" IS NULL
    `);

    // Backfill buyer replies: attach to nearest prior supplier message on same procedure
    await queryInterface.sequelize.query(`
      UPDATE procedure_qa_messages AS buyer_msg
      SET "threadSupplierId" = (
        SELECT s_msg."threadSupplierId"
        FROM procedure_qa_messages AS s_msg
        WHERE s_msg."procedureId" = buyer_msg."procedureId"
          AND s_msg."authorRole" = 'supplier'
          AND s_msg."threadSupplierId" IS NOT NULL
          AND s_msg."createdAt" <= buyer_msg."createdAt"
        ORDER BY s_msg."createdAt" DESC
        LIMIT 1
      )
      WHERE buyer_msg."authorRole" = 'procuring_entity'
        AND buyer_msg."threadSupplierId" IS NULL
    `);

    // Remaining public board messages become private by default
    await queryInterface.sequelize.query(`
      UPDATE procedure_qa_messages SET "isPublic" = false
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('procedure_qa_messages', 'procedure_qa_messages_procedure_thread_idx');
    await queryInterface.removeColumn('procedure_qa_messages', 'threadSupplierId');
  }
};
