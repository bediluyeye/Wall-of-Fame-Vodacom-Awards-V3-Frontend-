export type Role = "USER" | "HOD" | "HR_ADMIN" | "HRBP";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  division: string;
  department: string;
  location: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  departmentScope?: string;
  divisionScope?: string;
  employee?: Employee;
};

export type Nomination = {
  id: string;
  nomineeId: string;
  nominatedById: string;
  department: string;
  division: string;
  month: number;
  year: number;
  submittedAt: string;
  employee?: Employee;
  comments: Array<{
    id: string;
    category: string;
    categoryLabel?: string;
    text: string;
    createdAt: string;
  }>;
};

export type Election = {
  id: string;
  nominationId?: string;
  employeeId: string;
  electedById: string;
  department: string;
  month: number;
  year: number;
  status: "elected" | "hrbp_arbitrated";
  reason?: string;
  submittedAt: string;
  employee?: Employee;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<{ user: CurrentUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return request<{ user: CurrentUser | null }>("/api/auth/me");
  },
  employees(params: { department?: string; division?: string } = {}) {
    const query = new URLSearchParams();
    if (params.department) query.set("department", params.department);
    if (params.division) query.set("division", params.division);
    return request<{ employees: Employee[] }>(`/api/employees?${query.toString()}`);
  },
  nominationMine() {
    return request<{ nominations: Nomination[] }>("/api/nominations/mine");
  },
  nominationDepartment() {
    return request<{ nominations: Nomination[] }>("/api/nominations/department");
  },
  nominationAll() {
    return request<{ nominations: Nomination[] }>("/api/nominations/all");
  },
  createNomination(payload: {
    nomineeId: string;
    month: number;
    year: number;
    comments: Array<{ category: string; text: string }>;
  }) {
    return request<{ nomination: Nomination }>("/api/nominations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  electionMine() {
    return request<{ elections: Election[] }>("/api/elections/mine");
  },
  electionDepartment() {
    return request<{ elections: Election[] }>("/api/elections/department");
  },
  electionAll() {
    return request<{ elections: Election[] }>("/api/elections/all");
  },
  electionResults() {
    return request<{ results: Election[] }>("/api/elections/results");
  },
  createElection(payload: { nominationId: string; month: number; year: number }) {
    return request<{ election: Election }>("/api/elections", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  arbitrate(payload: { employeeId: string; month: number; year: number; reason: string }) {
    return request<{ election: Election }>("/api/elections/arbitrate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async exportNominees() {
    const response = await fetch(`${API_URL}/api/nominations/export`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  }
};
