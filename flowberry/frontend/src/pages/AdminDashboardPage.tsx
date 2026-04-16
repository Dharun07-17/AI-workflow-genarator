import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; user_id: string; status: string; created_at: string }> }>("/admin/workflows");
      return res.data.data;
    },
  });

  async function onDelete(id: string) {
    await api.delete(`/admin/workflows/${id}`);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
        <p className="mb-4 text-sm text-white/70">All workflows (admin only)</p>
        <div className="space-y-2 text-sm">
          {(data ?? []).map((row) => (
            <div key={row.id} className="rounded border border-zinc-800 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{row.id}</p>
                <p className="text-white/70">user: {row.user_id} | status: {row.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/workflows/${row.id}`)}
                  className="rounded border border-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-800"
                >
                  View
                </button>
                <button
                  onClick={() => onDelete(row.id)}
                  className="rounded border border-red-600 px-3 py-1 text-xs text-red-400 hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
