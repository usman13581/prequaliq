const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5001';

const GPU_DOCS_URL =
  import.meta.env.VITE_AI_DOCS_URL || 'http://connect01.trooper.ai:22528/docs';

export default function Developer() {
  const backendDocs = `${API_BASE}/api-docs`;
  const backendOpenApi = `${API_BASE}/api-docs/openapi.json`;
  const gpuRedoc = GPU_DOCS_URL.replace(/\/docs$/, '/redoc');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PrequaliQ Developer</h1>
        <p className="text-gray-600 mb-10">
          API reference for the Express backend and the self-hosted GPU AI extraction service.
        </p>

        <div className="space-y-4">
          <a
            href={backendDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-400 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">PrequaliQ API (Swagger)</h2>
            <p className="text-sm text-gray-500 mt-1">All backend routes — auth, supplier, admin, AI proxy</p>
            <p className="text-sm text-primary-600 mt-3 font-mono break-all">{backendDocs}</p>
          </a>

          <a
            href={backendOpenApi}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-400 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">OpenAPI JSON</h2>
            <p className="text-sm text-gray-500 mt-1">Machine-readable spec for codegen / Postman import</p>
            <p className="text-sm text-primary-600 mt-3 font-mono break-all">{backendOpenApi}</p>
          </a>

          <a
            href={GPU_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-400 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">GPU AI Service (FastAPI Swagger)</h2>
            <p className="text-sm text-gray-500 mt-1">Ollama document extraction — classify, insurance, company, certificates</p>
            <p className="text-sm text-primary-600 mt-3 font-mono break-all">{GPU_DOCS_URL}</p>
          </a>

          <a
            href={gpuRedoc}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-primary-400 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900">GPU AI Service (ReDoc)</h2>
            <p className="text-sm text-gray-500 mt-1">Alternative API reference layout</p>
            <p className="text-sm text-primary-600 mt-3 font-mono break-all">{gpuRedoc}</p>
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-10">
          Supplier AI routes require a JWT from <code className="bg-gray-100 px-1 rounded">POST /api/auth/login</code>.
          GPU endpoints use <code className="bg-gray-100 px-1 rounded">X-API-Key</code> (backend proxies this).
        </p>
      </div>
    </div>
  );
}
