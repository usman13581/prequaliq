'use strict';

/** Global AI flags + per-user AI preferences (master + per-feature). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_feature_flags', {
      featureKey: {
        type: Sequelize.STRING(128),
        allowNull: false,
        primaryKey: true
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('user_ai_preferences', {
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      masterEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      preferences: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Seed defaults: global AI master + each ai.* feature ON
    const now = new Date();
    const aiKeys = [
      'ai.__master__',
      'ai.profile_assist',
      'ai.requirements_builder',
      'ai.bid_suggestions',
      'ai.completeness_conflict',
      'ai.qualification_risk',
      'ai.evaluation_copilot',
      'ai.qa_draft_replies',
      'ai.announcement_draft',
      'ai.award_memo',
      'ai.cpv_recommender',
      'ai.supplier_matching'
    ];
    await queryInterface.bulkInsert(
      'platform_feature_flags',
      aiKeys.map((featureKey) => ({
        featureKey,
        enabled: true,
        createdAt: now,
        updatedAt: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_ai_preferences');
    await queryInterface.dropTable('platform_feature_flags');
  }
};
