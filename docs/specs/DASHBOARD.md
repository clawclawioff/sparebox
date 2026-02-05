# Dashboard Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Dashboard Layout

### 1.1 Sidebar Navigation

```
┌─────────────────────────────────────────────────┐
│ [Logo] Sparebox                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Overview          ← Active indicator            │
│ My Agents         (for users)                   │
│ My Machines       (for hosts)                   │
│ Browse Hosts      (for users)                   │
│ ─────────────────                               │
│ Billing           (for users)                   │
│ Earnings          (for hosts)                   │
│ Settings                                        │
│                                                 │
├─────────────────────────────────────────────────┤
│ [Avatar] User Name                              │
│ user@email.com                                  │
│ [Sign Out]                                      │
└─────────────────────────────────────────────────┘
```

### 1.2 Responsive Behavior

- **Desktop (≥1024px):** Fixed sidebar (256px), content fills remaining
- **Tablet (768-1023px):** Collapsible sidebar, hamburger menu
- **Mobile (<768px):** Bottom nav or full-screen drawer

### 1.3 Layout Component

```tsx
// src/app/(dashboard)/layout.tsx

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Requirements:
// - Redirect to /login if no session
// - Show role-appropriate nav items
// - Include user dropdown in sidebar
// - Handle loading state during session check
```

---

## 2. Overview Page (Dashboard Home)

**Route:** `/dashboard`

### 2.1 User View (role = 'user')

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, {name}                                        │
│ Deploy and monitor your AI agents                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Active      │  │ Monthly     │  │ Total       │          │
│ │ Agents      │  │ Cost        │  │ Uptime      │          │
│ │ 3           │  │ $35.00      │  │ 99.2%       │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Your Agents                              [+ Deploy]   │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Agent Name    │ Status   │ Host     │ Actions        │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ my-assistant  │ 🟢 Running│ Sarah K. │ [View] [Stop]  │  │
│ │ dev-agent     │ 🟢 Running│ Mike L.  │ [View] [Stop]  │  │
│ │ test-agent    │ 🔴 Stopped│ -        │ [View] [Start] │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Recent Activity                                       │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ • Agent "my-assistant" started - 2 hours ago          │  │
│ │ • Subscription renewed - 3 days ago                   │  │
│ │ • Agent "dev-agent" deployed - 5 days ago             │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Host View (role = 'host')

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, {name}                                        │
│ Manage your machines and track earnings                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Active      │  │ Earnings    │  │ Hosted      │          │
│ │ Machines    │  │ (MTD)       │  │ Agents      │          │
│ │ 2           │  │ $48.00      │  │ 5           │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Your Machines                        [+ Add Machine]  │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Machine Name  │ Status   │ Agents │ Earnings │ Action │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Home Server   │ 🟢 Online │ 3      │ $27/mo   │ [View] │  │
│ │ Office Laptop │ 🟢 Online │ 2      │ $21/mo   │ [View] │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Earnings Overview                     [View Details]  │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ [Simple bar chart showing last 6 months]              │  │
│ │                                                       │  │
│ │ Next payout: $48.00 on Feb 15                         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Data Requirements

**User Dashboard:**
```typescript
interface UserDashboardData {
  stats: {
    activeAgents: number;
    monthlyCost: number; // cents
    averageUptime: number; // percentage
  };
  agents: {
    id: string;
    name: string;
    status: AgentStatus;
    host: { name: string } | null;
  }[];
  recentActivity: {
    message: string;
    timestamp: Date;
  }[];
}
```

**Host Dashboard:**
```typescript
interface HostDashboardData {
  stats: {
    activeMachines: number;
    earningsMTD: number; // cents
    hostedAgents: number;
  };
  machines: {
    id: string;
    name: string;
    status: HostStatus;
    agentCount: number;
    monthlyEarnings: number; // cents
  }[];
  earningsHistory: {
    month: string;
    amount: number; // cents
  }[];
  nextPayout: {
    amount: number; // cents
    date: Date;
  } | null;
}
```

### 2.4 tRPC Procedures

```typescript
// New router: dashboard
dashboard: router({
  // Get dashboard data based on user role
  getData: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    
    if (user.role === 'host') {
      return getHostDashboardData(ctx.db, user.id);
    } else {
      return getUserDashboardData(ctx.db, user.id);
    }
  }),
})
```

### 2.5 Empty States

**User with no agents:**
```
┌─────────────────────────────────────────────────┐
│ [Icon: Server with plus]                        │
│                                                 │
│ No agents deployed yet                          │
│                                                 │
│ Deploy your first AI agent to get started.      │
│ Browse available hosts and pick one that        │
│ fits your needs.                                │
│                                                 │
│ [Browse Hosts] [Learn More]                     │
└─────────────────────────────────────────────────┘
```

**Host with no machines:**
```
┌─────────────────────────────────────────────────┐
│ [Icon: Computer with plus]                      │
│                                                 │
│ No machines registered yet                      │
│                                                 │
│ Add your first machine to start earning.        │
│ You'll need to install our lightweight agent    │
│ software to get started.                        │
│                                                 │
│ [Add Machine] [View Requirements]               │
└─────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 StatCard

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  icon?: React.ReactNode;
}

// Usage:
<StatCard 
  label="Active Agents" 
  value={3} 
  trend={{ direction: 'up', value: '+1 this month' }}
  icon={<Server />}
/>
```

### 3.2 DataTable

```tsx
interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

// Usage:
<DataTable
  columns={[
    { header: 'Name', accessor: 'name' },
    { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: (row) => <ActionMenu row={row} /> },
  ]}
  data={agents}
  emptyState={<EmptyAgents />}
/>
```

### 3.3 StatusBadge

```tsx
interface StatusBadgeProps {
  status: 'running' | 'stopped' | 'pending' | 'failed' | 'online' | 'offline';
}

// Styling:
// running/online: green dot + "Running"/"Online"
// stopped/offline: gray dot + "Stopped"/"Offline"
// pending: yellow dot + "Pending"
// failed: red dot + "Failed"
```

---

## 4. State Management

### 4.1 Server State (tRPC + React Query)

```typescript
// Dashboard data
const { data, isLoading, refetch } = trpc.dashboard.getData.useQuery();

// Refetch on window focus (React Query default)
// Refetch every 30 seconds for status updates
const { data } = trpc.dashboard.getData.useQuery(undefined, {
  refetchInterval: 30000,
});
```

### 4.2 Client State

Minimal client state needed:
- Sidebar collapsed state (localStorage)
- Modal open/close states (local component state)

---

## 5. Loading & Error States

### 5.1 Initial Load

```tsx
if (isLoading) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <Skeleton className="h-64 mt-8" />
  );
}
```

### 5.2 Error State

```tsx
if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Failed to load dashboard</AlertTitle>
      <AlertDescription>
        {error.message}
        <Button onClick={() => refetch()}>Retry</Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## 6. Permissions & Guards

### 6.1 Route Protection

```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await auth.api.getSession({ headers: headers() });
  
  if (!session) {
    redirect('/login');
  }
  
  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
```

### 6.2 Role-Based Content

```tsx
// Show different nav items based on role
const navItems = useMemo(() => {
  const common = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];
  
  if (user.role === 'host') {
    return [
      ...common.slice(0, 1),
      { href: '/dashboard/hosts', label: 'My Machines', icon: Server },
      { href: '/dashboard/earnings', label: 'Earnings', icon: DollarSign },
      ...common.slice(1),
    ];
  }
  
  return [
    ...common.slice(0, 1),
    { href: '/dashboard/agents', label: 'My Agents', icon: Cpu },
    { href: '/dashboard/browse', label: 'Browse Hosts', icon: Search },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    ...common.slice(1),
  ];
}, [user.role]);
```

---

## 7. Accessibility

- All interactive elements focusable via keyboard
- ARIA labels on icon-only buttons
- Skip link to main content
- Color contrast meets WCAG AA
- Status indicated by more than just color (icons/text)

---

## 8. Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| User with 0 agents | Show empty state, CTA to browse hosts |
| User with 5 agents | Show stats, table with pagination |
| Host with 0 machines | Show empty state, CTA to add machine |
| Host with machines but no agents | Show machines, $0 earnings |
| Session expired | Redirect to /login |
| API error | Show error state with retry button |
| Slow network | Show loading skeletons |
