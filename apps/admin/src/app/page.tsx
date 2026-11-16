const stats = [
	{ label: "Total users", value: "1,284", detail: "+12% this month" },
	{ label: "Active projects", value: "36", detail: "+4 this month" },
	{ label: "Pending requests", value: "8", detail: "Needs attention" },
];

const activities = [
	{ action: "Created a new project", user: "Alex Morgan", status: "Complete", time: "10 min ago" },
	{ action: "Requested access", user: "Taylor Lee", status: "Pending", time: "1 hour ago" },
	{ action: "Updated workspace settings", user: "Jordan Kim", status: "Complete", time: "Yesterday" },
];

export default function AdminPage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<div className="mx-auto flex min-h-screen max-w-7xl">
				<aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-6 md:block">
					<a href="#overview" className="text-xl font-bold tracking-tight">
						Mind Plus <span className="text-indigo-600">Admin</span>
					</a>
					<nav aria-label="Main navigation" className="mt-10 space-y-2">
						<a href="#overview" className="block rounded-lg bg-indigo-50 px-4 py-3 font-medium text-indigo-700">Overview</a>
						<a href="#users" className="block rounded-lg px-4 py-3 text-slate-600 hover:bg-slate-100">Users</a>
						<a href="#projects" className="block rounded-lg px-4 py-3 text-slate-600 hover:bg-slate-100">Projects</a>
						<a href="#settings" className="block rounded-lg px-4 py-3 text-slate-600 hover:bg-slate-100">Settings</a>
					</nav>
				</aside>

				<section id="overview" className="min-w-0 flex-1 p-6 sm:p-10">
					<header className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium text-slate-500">Administration</p>
							<h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
						</div>
						<button type="button" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
							Add user
						</button>
					</header>

					<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{stats.map((stat) => (
							<article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
								<h2 className="text-sm font-medium text-slate-500">{stat.label}</h2>
								<p className="mt-3 text-3xl font-bold">{stat.value}</p>
								<p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
							</article>
						))}
					</div>

					<section id="users" className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold">Recent activity</h2>
								<p className="mt-1 text-sm text-slate-500">A quick look at what is happening in your workspace.</p>
							</div>
							<a href="#projects" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</a>
						</div>
						<div className="mt-6 overflow-x-auto">
							<table className="w-full min-w-[32rem] text-left text-sm">
								<thead className="border-b border-slate-200 text-slate-500">
									<tr>
										<th scope="col" className="pb-3 font-medium">Activity</th>
										<th scope="col" className="pb-3 font-medium">User</th>
										<th scope="col" className="pb-3 font-medium">Status</th>
										<th scope="col" className="pb-3 font-medium">When</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{activities.map((activity) => (
										<tr key={activity.action}>
											<td className="py-4 font-medium">{activity.action}</td>
											<td className="py-4 text-slate-600">{activity.user}</td>
											<td className="py-4">
												<span className={`rounded-full px-2.5 py-1 text-xs font-medium ${activity.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
													{activity.status}
												</span>
											</td>
											<td className="py-4 text-slate-500">{activity.time}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</section>
			</div>
		</main>
	);
}
