import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; user_id: string; status: string; created_at: string }> }>("/admin/workflows");
      return res.data.data;
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
        <p className="mb-4 text-sm text-zinc-400">All workflows (admin only)</p>
        <div className="space-y-2 text-sm">
          {(data ?? []).map((row) => (
            <div key={row.id} className="rounded border border-zinc-800 p-3">
              <p>{row.id}</p>
              <p className="text-zinc-400">user: {row.user_id} | status: {row.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
