export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">PayFlow</h1>
        <p className="text-gray-400 text-lg">Developer Portal</p>
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-sm px-4 py-2 rounded-full border border-green-500/20">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          All systems operational
        </div>
      </div>
    </div>
  )
}