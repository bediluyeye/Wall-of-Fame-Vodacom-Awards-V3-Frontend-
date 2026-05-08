"use client";

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import {
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRound,
  Vote,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, type CurrentUser, type Election, type Employee, type Nomination } from "@/lib/api";

const monthOptions = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre"
];

const categories = [
  { value: "earn_customer", label: "Earn customer" },
  { value: "loyalty", label: "Loyalty" },
  { value: "experiment_and_learn_fast", label: "Experiment and learn fast" },
  { value: "get_it_done_together", label: "Get it done together" }
];

const demoUsers = [
  { email: "agent@vodacom.cd", label: "User" },
  { email: "hod.sales@vodacom.cd", label: "HOD Sales" },
  { email: "hod.network@vodacom.cd", label: "HOD Network" },
  { email: "hr.admin@vodacom.cd", label: "HR Admin" },
  { email: "hrbp@vodacom.cd", label: "HRBP" }
];

type TabKey = "overview" | "nomination" | "election" | "publication" | "admin";
type AdminPage = "home" | "nominees" | "comments" | "export" | "history";
type HrbpPage = "home" | "results" | "history" | "arbitration";
type ArbitrationForm = {
  employeeId: string;
  month: number;
  year: number;
  reason: string;
};
type HrbpArbitrationContext = {
  allowed: boolean;
  reason: "no_me" | "tie" | "unique_me" | "already_arbitrated";
  eligibleEmployees: Employee[];
  winner?: Employee;
};

function fullName(employee?: Employee) {
  return employee ? `${employee.firstName} ${employee.lastName}` : "Employee";
}

function monthLabel(month: number, year: number) {
  return `${monthOptions[month - 1] ?? month} ${year}`;
}

function matches(value: string | undefined, query: string) {
  return value?.toLowerCase().includes(query.toLowerCase()) ?? false;
}

function employeeText(employee?: Employee) {
  return [employee?.firstName, employee?.lastName, employee?.email, employee?.title, employee?.department, employee?.division]
    .filter(Boolean)
    .join(" ");
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function WallOfFameApp() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [email, setEmail] = useState("hod.sales@vodacom.cd");
  const [password, setPassword] = useState("password123");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentNominees, setDepartmentNominees] = useState<Nomination[]>([]);
  const [myNominations, setMyNominations] = useState<Nomination[]>([]);
  const [allNominations, setAllNominations] = useState<Nomination[]>([]);
  const [departmentElections, setDepartmentElections] = useState<Election[]>([]);
  const [myElections, setMyElections] = useState<Election[]>([]);
  const [allElections, setAllElections] = useState<Election[]>([]);
  const [results, setResults] = useState<Election[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [adminPage, setAdminPage] = useState<AdminPage>("home");
  const [hrbpPage, setHrbpPage] = useState<HrbpPage>("home");

  const now = new Date();
  const [nominationForm, setNominationForm] = useState({
    nomineeId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    comments: [
      { category: "earn_customer", text: "" },
      { category: "get_it_done_together", text: "" }
    ]
  });
  const [electionForm, setElectionForm] = useState({
    nominationId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear()
  });
  const [arbitrationForm, setArbitrationForm] = useState({
    employeeId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    reason: "Ex aequo or ME vacancy"
  });

  const canNominate = user?.role === "HOD";
  const canVote = user?.role === "HOD";
  const canAdmin = user?.role === "HR_ADMIN";
  const canArbitrate = user?.role === "HRBP";

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
      { key: "overview", label: "Profil", icon: UserRound }
    ];

    if (canNominate) tabs.push({ key: "nomination", label: "Nomination", icon: Award });
    if (canVote) tabs.push({ key: "election", label: "Election", icon: Vote });
    if (user?.role === "HOD" || user?.role === "HRBP") {
      tabs.push({ key: "publication", label: "Resultats", icon: Trophy });
    }
    if (canAdmin) tabs.push({ key: "admin", label: "HR Admin", icon: ShieldCheck });

    return tabs;
  }, [canAdmin, canNominate, canVote, user?.role]);

  const visibleEmployees = useMemo(
    () => employees.filter((employee) => !globalQuery || matches(employeeText(employee), globalQuery)),
    [employees, globalQuery]
  );

  async function refresh(nextUser = user) {
    if (!nextUser) return;

    setError("");
    const employeeParams =
      nextUser.role === "HOD"
        ? { department: nextUser.departmentScope, division: nextUser.divisionScope }
        : nextUser.role === "HRBP"
          ? { department: nextUser.departmentScope }
          : {};

    const employeeResult = await api.employees(employeeParams);
    setEmployees(employeeResult.employees);

    if (nextUser.role === "HOD") {
      const [mineNom, deptNom, mineElec, deptElec, resultData] = await Promise.all([
        api.nominationMine(),
        api.nominationDepartment(),
        api.electionMine(),
        api.electionDepartment(),
        api.electionResults()
      ]);
      setMyNominations(uniqueById(mineNom.nominations));
      setDepartmentNominees(uniqueById(deptNom.nominations));
      setMyElections(uniqueById(mineElec.elections));
      setDepartmentElections(uniqueById(deptElec.elections));
      setResults(uniqueById(resultData.results));
      setNominationForm((form) => ({ ...form, nomineeId: form.nomineeId || employeeResult.employees[0]?.id || "" }));
      setElectionForm((form) => ({ ...form, nominationId: form.nominationId || deptNom.nominations[0]?.id || "" }));
    }

    if (nextUser.role === "HR_ADMIN") {
      const [nomData, electionData] = await Promise.all([api.nominationAll(), api.electionAll()]);
      setAllNominations(uniqueById(nomData.nominations));
      setAllElections(uniqueById(electionData.elections));
      setResults(uniqueById(electionData.elections));
    }

    if (nextUser.role === "HRBP") {
      const [deptNom, deptElec, resultData] = await Promise.all([
        api.nominationDepartment(),
        api.electionDepartment(),
        api.electionResults()
      ]);
      setDepartmentNominees(uniqueById(deptNom.nominations));
      setDepartmentElections(uniqueById(deptElec.elections));
      setResults(uniqueById(resultData.results));
      setArbitrationForm((form) => ({ ...form, employeeId: form.employeeId || employeeResult.employees[0]?.id || "" }));
    }
  }

  useEffect(() => {
    api
      .me()
      .then(async ({ user: current }) => {
        if (current) {
          setUser(current);
          await refresh(current);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { user: current } = await api.login(email, password);
      setUser(current);
      setActiveTab("overview");
      await refresh(current);
      setMessage("Connexion reussie.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setActiveTab("overview");
    setMessage("");
    setError("");
  }

  async function handleNomination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.createNomination(nominationForm);
      await refresh();
      setMessage("Nomination soumise.");
      setNominationForm((form) => ({
        ...form,
        comments: [
          { category: "earn_customer", text: "" },
          { category: "get_it_done_together", text: "" }
        ]
      }));
    } catch (nominationError) {
      setError(nominationError instanceof Error ? nominationError.message : "Nomination impossible");
    } finally {
      setLoading(false);
    }
  }

  async function handleElection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.createElection(electionForm);
      await refresh();
      setMessage("Election soumise.");
    } catch (electionError) {
      setError(electionError instanceof Error ? electionError.message : "Election impossible");
    } finally {
      setLoading(false);
    }
  }

  async function handleArbitration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.arbitrate(arbitrationForm);
      await refresh();
      setMessage("Arbitrage HRBP soumis.");
    } catch (arbitrationError) {
      setError(arbitrationError instanceof Error ? arbitrationError.message : "Arbitrage impossible");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setError("");
    try {
      const blob = await api.exportNominees();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wall-of-fame-nominees.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export impossible");
    }
  }

  function addComment() {
    setNominationForm((form) => ({
      ...form,
      comments: [...form.comments, { category: "loyalty", text: "" }]
    }));
  }

  function removeComment(index: number) {
    setNominationForm((form) => ({
      ...form,
      comments: form.comments.length <= 2 ? form.comments : form.comments.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  if (!user) {
    return (
      <main className="login-shell flex min-h-screen items-center justify-center px-4 py-10">
        <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hero-panel flex min-h-[560px] flex-col justify-between rounded-lg p-8 text-white">
            <div>
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-md bg-white text-red-700 shadow-xl">
                <Trophy aria-hidden className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold uppercase text-red-100">Vodacom Wall of Fame</p>
              <h1 className="mt-3 max-w-2xl text-5xl font-black leading-tight">
                Pilotez les nominations et elections employee of the month.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-red-50">
                Un espace interne clair pour reconnaitre les talents, suivre les decisions et publier les resultats.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["HOD", "Nommer et elire"],
                ["HR Admin", "Controler et exporter"],
                ["HRBP", "Arbitrer les cas speciaux"]
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg border border-white/25 bg-white/15 p-4 shadow-sm">
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-red-50">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/70">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-red-700">Connexion securisee</p>
                <h2 className="mt-1 text-2xl font-black text-zinc-950">Acceder au portail</h2>
              </div>
              <ShieldCheck aria-hidden className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-4">
              <Field label="Email">
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Mot de passe">
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <Button className="w-full" disabled={loading}>
                {loading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </div>
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-3 text-sm font-bold text-zinc-800">Comptes demo</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {demoUsers.map((demo) => (
                  <button
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition hover:border-red-300 hover:text-red-700"
                    key={demo.email}
                    type="button"
                    onClick={() => setEmail(demo.email)}
                  >
                    <span className="block font-bold">{demo.label}</span>
                    <span className="block text-xs text-zinc-500">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-lg border border-white/20 bg-white p-5 shadow-xl shadow-red-950/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-red-600 text-white">
                <Trophy aria-hidden className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-zinc-950">Wall of Fame</h1>
                  <Badge variant="soft">{user.role}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {fullName(user.employee)} - {user.employee?.title}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-64">
                <Search aria-hidden className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher..."
                  value={globalQuery}
                  onChange={(event) => setGlobalQuery(event.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={() => refresh()} disabled={loading}>
                <RefreshCw aria-hidden className="h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" variant="ghost" onClick={handleLogout}>
                <LogOut aria-hidden className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  variant={activeTab === tab.key ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "admin") setAdminPage("home");
                    if (tab.key === "publication" && user.role === "HRBP") setHrbpPage("home");
                  }}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </header>

        {(message || error) && (
          <div className="mb-5">
            <Alert tone={error ? "error" : "success"}>{error || message}</Alert>
          </div>
        )}

        {activeTab === "overview" && (
          <Overview
            user={user}
            employees={visibleEmployees}
            results={filterElections(results, globalQuery)}
            nominations={filterNominations(
              user.role === "HR_ADMIN" ? allNominations : user.role === "USER" ? [] : departmentNominees,
              globalQuery
            )}
          />
        )}

        {activeTab === "nomination" && canNominate && (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Nouvelle nomination" icon={Award} eyebrow="HOD">
              <form onSubmit={handleNomination} className="mt-5 grid gap-4">
                <Field label="Agent de ma division">
                  <Select
                    value={nominationForm.nomineeId}
                    onChange={(event) => setNominationForm((form) => ({ ...form, nomineeId: event.target.value }))}
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {fullName(employee)} - {employee.division}
                      </option>
                    ))}
                  </Select>
                </Field>
                <PeriodFields
                  month={nominationForm.month}
                  year={nominationForm.year}
                  onMonth={(month) => setNominationForm((form) => ({ ...form, month }))}
                  onYear={(year) => setNominationForm((form) => ({ ...form, year }))}
                />
                <CategoryProgress comments={nominationForm.comments} />
                {nominationForm.comments.map((comment, index) => (
                  <div key={index} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Label>Commentaire {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={nominationForm.comments.length <= 2}
                        onClick={() => removeComment(index)}
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                        Retirer
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      <Select
                        value={comment.category}
                        onChange={(event) =>
                          setNominationForm((form) => ({
                            ...form,
                            comments: form.comments.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, category: event.target.value } : item
                            )
                          }))
                        }
                      >
                        {categories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </Select>
                      <Textarea
                        placeholder="Decrivez l'impact concret observe..."
                        value={comment.text}
                        onChange={(event) =>
                          setNominationForm((form) => ({
                            ...form,
                            comments: form.comments.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, text: event.target.value } : item
                            )
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={addComment}>
                    <Plus aria-hidden className="h-4 w-4" />
                    Ajouter commentaire
                  </Button>
                  <Button disabled={loading}>
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                    Soumettre
                  </Button>
                </div>
              </form>
            </Panel>
            <NominationTable title="Mon historique de nominations" nominations={filterNominations(myNominations, globalQuery)} />
          </section>
        )}

        {activeTab === "election" && canVote && (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Election departement" icon={Vote} eyebrow="HOD">
              <form onSubmit={handleElection} className="mt-5 grid gap-4">
                <Field label="Nominee a elire">
                  <Select
                    value={electionForm.nominationId}
                    onChange={(event) => setElectionForm((form) => ({ ...form, nominationId: event.target.value }))}
                  >
                    {departmentNominees.map((nomination) => (
                      <option key={nomination.id} value={nomination.id}>
                        {fullName(nomination.employee)} - {monthLabel(nomination.month, nomination.year)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <PeriodFields
                  month={electionForm.month}
                  year={electionForm.year}
                  onMonth={(month) => setElectionForm((form) => ({ ...form, month }))}
                  onYear={(year) => setElectionForm((form) => ({ ...form, year }))}
                />
                <Button disabled={loading || !electionForm.nominationId}>
                  <Trophy aria-hidden className="h-4 w-4" />
                  Elire le meilleur employee
                </Button>
              </form>
            </Panel>
            <div className="grid gap-5">
              <NominationTable title="Nominees du departement" nominations={filterNominations(departmentNominees, globalQuery)} />
              <ElectionTable title="Mon historique d'elections" elections={filterElections(myElections, globalQuery)} />
            </div>
          </section>
        )}

        {activeTab === "publication" && user.role === "HOD" && (
          <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <ElectionTable title="Resultats du departement" elections={filterElections(results, globalQuery)} />
            <ElectionTable title="Historique du departement" elections={filterElections(departmentElections, globalQuery)} />
          </section>
        )}

        {activeTab === "publication" && canArbitrate && (
          <HrbpWorkspace
            page={hrbpPage}
            setPage={setHrbpPage}
            results={filterElections(results, globalQuery)}
            history={departmentElections}
            filteredHistory={filterElections(departmentElections, globalQuery)}
            employees={employees}
            arbitrationForm={arbitrationForm}
            setArbitrationForm={setArbitrationForm}
            loading={loading}
            onSubmit={handleArbitration}
          />
        )}

        {activeTab === "admin" && canAdmin && (
          <HrAdminWorkspace
            page={adminPage}
            setPage={setAdminPage}
            nominations={filterNominations(allNominations, globalQuery)}
            elections={filterElections(allElections, globalQuery)}
            allNominations={allNominations}
            onExport={handleExport}
          />
        )}
      </div>
    </main>
  );
}

function HrAdminWorkspace({
  page,
  setPage,
  nominations,
  elections,
  allNominations,
  onExport
}: {
  page: AdminPage;
  setPage: (page: AdminPage) => void;
  nominations: Nomination[];
  elections: Election[];
  allNominations: Nomination[];
  onExport: () => void;
}) {
  const commentsCount = allNominations.reduce((total, item) => total + item.comments.length, 0);

  if (page === "home") {
    return (
      <section className="grid gap-5">
        <Panel title="Espace HR Admin" icon={ShieldCheck} eyebrow="Fonctionnalites">
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric icon={Award} label="Nominees" value={allNominations.length} />
            <Metric icon={BarChart3} label="Commentaires" value={commentsCount} />
            <Metric icon={Trophy} label="Best employees" value={elections.length} />
          </div>
        </Panel>
        <FeatureGrid>
          <FeatureButton icon={Award} title="Tous les nominees" onClick={() => setPage("nominees")} />
          <FeatureButton icon={BarChart3} title="Tous les commentaires" onClick={() => setPage("comments")} />
          <FeatureButton icon={Download} title="Export Excel" onClick={() => setPage("export")} />
          <FeatureButton icon={Trophy} title="Historique Vodacom" onClick={() => setPage("history")} />
        </FeatureGrid>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <SubpageHeader
        icon={page === "history" ? Trophy : page === "export" ? Download : page === "comments" ? BarChart3 : Award}
        title={
          page === "history"
            ? "Historique Vodacom"
            : page === "export"
              ? "Export Excel"
              : page === "comments"
                ? "Tous les commentaires"
                : "Tous les nominees"
        }
        onBack={() => setPage("home")}
      />
      {page === "nominees" && <NominationTable title="Tous les nominees" nominations={nominations} showComments={false} />}
      {page === "comments" && <CommentTable nominations={nominations} />}
      {page === "history" && <ElectionTable title="Historique global des best employees" elections={elections} />}
      {page === "export" && (
        <Panel title="Exporter les nominees" icon={Download} eyebrow="Excel">
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric icon={Award} label="Nominees" value={allNominations.length} />
              <Metric icon={BarChart3} label="Commentaires" value={commentsCount} />
              <Metric icon={Building2} label="Departements" value={new Set(allNominations.map((item) => item.department)).size} />
            </div>
            <Button type="button" onClick={onExport}>
              <Download aria-hidden className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </Panel>
      )}
    </section>
  );
}

function HrbpWorkspace({
  page,
  setPage,
  results,
  history,
  filteredHistory,
  employees,
  arbitrationForm,
  setArbitrationForm,
  loading,
  onSubmit
}: {
  page: HrbpPage;
  setPage: (page: HrbpPage) => void;
  results: Election[];
  history: Election[];
  filteredHistory: Election[];
  employees: Employee[];
  arbitrationForm: ArbitrationForm;
  setArbitrationForm: Dispatch<SetStateAction<ArbitrationForm>>;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const context = getHrbpArbitrationContext(history, employees, arbitrationForm.month, arbitrationForm.year);

  useEffect(() => {
    const firstEligibleEmployeeId = context.eligibleEmployees[0]?.id;

    if (firstEligibleEmployeeId && !context.eligibleEmployees.some((employee) => employee.id === arbitrationForm.employeeId)) {
      setArbitrationForm((form) => ({ ...form, employeeId: firstEligibleEmployeeId }));
    }
  }, [arbitrationForm.employeeId, context.eligibleEmployees, setArbitrationForm]);

  if (page === "home") {
    return (
      <section className="grid gap-5">
        <Panel title="Espace HRBP" icon={ShieldCheck} eyebrow="Fonctionnalites">
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric icon={Trophy} label="Resultats" value={results.length} />
            <Metric icon={BarChart3} label="Historique" value={filteredHistory.length} />
            <Metric icon={Building2} label="Employees" value={employees.length} />
          </div>
        </Panel>
        <FeatureGrid>
          <FeatureButton icon={Trophy} title="Resultat election" onClick={() => setPage("results")} />
          <FeatureButton icon={BarChart3} title="Historique departement" onClick={() => setPage("history")} />
          <FeatureButton icon={ShieldCheck} title="Arbitrage HRBP" onClick={() => setPage("arbitration")} />
        </FeatureGrid>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <SubpageHeader
        icon={page === "arbitration" ? ShieldCheck : page === "history" ? BarChart3 : Trophy}
        title={
          page === "arbitration"
            ? "Arbitrage HRBP"
            : page === "history"
              ? "Historique departement"
              : "Resultat election"
        }
        onBack={() => setPage("home")}
      />
      {page === "results" && <ElectionTable title="Resultats du departement" elections={results} />}
      {page === "history" && <ElectionTable title="Historique du departement" elections={filteredHistory} />}
      {page === "arbitration" && (
        <Panel title="Arbitrage HRBP" icon={ShieldCheck} eyebrow="Tie or ME vacancy">
          <div className="mt-5">
            <ArbitrationStatus context={context} month={arbitrationForm.month} year={arbitrationForm.year} />
          </div>
          <form onSubmit={onSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr_160px_160px_1fr_auto] lg:items-end">
            <Field label="Employee">
              <Select
                value={arbitrationForm.employeeId}
                onChange={(event) => setArbitrationForm((form) => ({ ...form, employeeId: event.target.value }))}
                disabled={!context.allowed}
              >
                {context.eligibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {fullName(employee)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mois">
              <Select
                value={String(arbitrationForm.month)}
                onChange={(event) => setArbitrationForm((form) => ({ ...form, month: Number(event.target.value) }))}
              >
                {monthOptions.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Annee">
              <Input
                type="number"
                value={arbitrationForm.year}
                onChange={(event) => setArbitrationForm((form) => ({ ...form, year: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Raison">
              <Input
                value={arbitrationForm.reason}
                onChange={(event) => setArbitrationForm((form) => ({ ...form, reason: event.target.value }))}
                disabled={!context.allowed}
              />
            </Field>
            <Button disabled={loading || !context.allowed}>
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              Valider
            </Button>
          </form>
        </Panel>
      )}
    </section>
  );
}

function getHrbpArbitrationContext(
  history: Election[],
  employees: Employee[],
  month: number,
  year: number
): HrbpArbitrationContext {
  const periodElections = history.filter((election) => election.month === month && election.year === year);
  const existingArbitration = periodElections.find((election) => election.status === "hrbp_arbitrated");

  if (existingArbitration) {
    return {
      allowed: false,
      reason: "already_arbitrated",
      eligibleEmployees: [],
      winner: existingArbitration.employee
    };
  }

  const hodElections = periodElections.filter((election) => election.status === "elected");

  if (hodElections.length === 0) {
    return {
      allowed: true,
      reason: "no_me",
      eligibleEmployees: employees
    };
  }

  const counts = new Map<string, number>();
  hodElections.forEach((election) => {
    counts.set(election.employeeId, (counts.get(election.employeeId) ?? 0) + 1);
  });

  const topScore = Math.max(...counts.values());
  const tiedIds = Array.from(counts.entries())
    .filter(([, count]) => count === topScore)
    .map(([employeeId]) => employeeId);

  if (tiedIds.length > 1) {
    return {
      allowed: true,
      reason: "tie",
      eligibleEmployees: employees.filter((employee) => tiedIds.includes(employee.id))
    };
  }

  return {
    allowed: false,
    reason: "unique_me",
    eligibleEmployees: [],
    winner: employees.find((employee) => employee.id === tiedIds[0])
  };
}

function ArbitrationStatus({
  context,
  month,
  year
}: {
  context: HrbpArbitrationContext;
  month: number;
  year: number;
}) {
  if (context.reason === "no_me") {
    return (
      <Alert tone="success">
        Aucun ME n'est defini pour {monthLabel(month, year)}. HRBP peut choisir un employe du departement.
      </Alert>
    );
  }

  if (context.reason === "tie") {
    return (
      <Alert tone="success">
        Ex aequo detecte pour {monthLabel(month, year)}. HRBP peut choisir uniquement parmi les employes a egalite.
      </Alert>
    );
  }

  if (context.reason === "already_arbitrated") {
    return (
      <Alert tone="error">
        Un arbitrage HRBP existe deja pour {monthLabel(month, year)}
        {context.winner ? `: ${fullName(context.winner)}.` : "."}
      </Alert>
    );
  }

  return (
    <Alert tone="error">
      Un ME unique existe deja pour {monthLabel(month, year)}
      {context.winner ? `: ${fullName(context.winner)}.` : "."} L'arbitrage HRBP est bloque.
    </Alert>
  );
}

function FeatureGrid({ children }: { children: ReactNode }) {
  return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</section>;
}

function FeatureButton({ icon: Icon, title, onClick }: { icon: LucideIcon; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface flex min-h-36 flex-col items-start justify-between rounded-lg p-5 text-left transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-red-50 text-red-700">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="text-lg font-black text-zinc-950">{title}</span>
    </button>
  );
}

function SubpageHeader({ icon: Icon, title, onBack }: { icon: LucideIcon; title: string; onBack: () => void }) {
  return (
    <div className="surface flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-700">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-black text-zinc-950">{title}</h2>
      </div>
      <Button type="button" variant="outline" onClick={onBack}>
        Retour
      </Button>
    </div>
  );
}

function CommentTable({ nominations }: { nominations: Nomination[] }) {
  const grouped = uniqueById(nominations).map((nomination) => ({
    nomination,
    comments: uniqueById(nomination.comments)
  }));
  const commentsCount = grouped.reduce((total, item) => total + item.comments.length, 0);

  return (
    <div className="surface rounded-lg">
      <TableTitle icon={BarChart3} title="Tous les commentaires" count={commentsCount} />
      <div className="grid gap-4 p-5">
        {grouped.map(({ nomination, comments }) => (
          <article key={nomination.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-950">{fullName(nomination.employee)}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {nomination.employee?.title} - {nomination.division}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{nomination.department}</Badge>
                <Badge variant="soft">{monthLabel(nomination.month, nomination.year)}</Badge>
                <Badge variant="soft">{comments.length} commentaire{comments.length > 1 ? "s" : ""}</Badge>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
                  <Badge variant="outline">{comment.categoryLabel ?? comment.category}</Badge>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{comment.text}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 py-10 text-center text-sm font-semibold text-zinc-500">
            Aucune donnee.
          </div>
        )}
      </div>
    </div>
  );
}

function filterNominations(nominations: Nomination[], query: string) {
  if (!query) return nominations;
  return nominations.filter((nomination) =>
    matches(
      [
        employeeText(nomination.employee),
        nomination.department,
        nomination.division,
        monthLabel(nomination.month, nomination.year),
        nomination.comments.map((comment) => `${comment.categoryLabel ?? comment.category} ${comment.text}`).join(" ")
      ].join(" "),
      query
    )
  );
}

function filterElections(elections: Election[], query: string) {
  if (!query) return elections;
  return elections.filter((election) =>
    matches(
      [employeeText(election.employee), election.department, election.status, election.reason, monthLabel(election.month, election.year)].join(" "),
      query
    )
  );
}

function Alert({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  eyebrow,
  children,
  className = ""
}: {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface rounded-lg p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-700">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <div>
          {eyebrow && <p className="text-xs font-bold uppercase text-red-700">{eyebrow}</p>}
          <h2 className="text-lg font-black text-zinc-950">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PeriodFields({
  month,
  year,
  onMonth,
  onYear
}: {
  month: number;
  year: number;
  onMonth: (month: number) => void;
  onYear: (year: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Mois">
        <Select value={String(month)} onChange={(event) => onMonth(Number(event.target.value))}>
          {monthOptions.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Annee">
        <Input type="number" value={year} onChange={(event) => onYear(Number(event.target.value))} />
      </Field>
    </div>
  );
}

function CategoryProgress({ comments }: { comments: Array<{ category: string; text: string }> }) {
  const completed = comments.filter((comment) => comment.text.trim().length > 0).length;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-zinc-900">Commentaires requis</p>
        <Badge variant={completed >= 2 ? "default" : "outline"}>{completed}/2 minimum</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {categories.map((category) => {
          const active = comments.some((comment) => comment.category === category.value && comment.text.trim());
          return (
            <span
              key={category.value}
              className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                active ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {category.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Overview({
  user,
  employees,
  results,
  nominations
}: {
  user: CurrentUser;
  employees: Employee[];
  results: Election[];
  nominations: Nomination[];
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <Panel icon={UserRound} title="About me" eyebrow="Profil">
        <dl className="mt-6 grid gap-4 text-sm">
          {[
            ["Nom", fullName(user.employee)],
            ["Email", user.email],
            ["Role", user.role],
            ["Departement", user.employee?.department ?? "-"],
            ["Division", user.employee?.division ?? "-"],
            ["Localisation", user.employee?.location ?? "-"]
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <dt className="font-semibold text-zinc-500">{label}</dt>
              <dd className="text-right font-bold text-zinc-950">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric icon={Building2} label="Employees visibles" value={employees.length} />
          <Metric icon={Award} label="Nominations" value={nominations.length} />
          <Metric icon={Trophy} label="Resultats" value={results.length} />
        </div>
        <EmployeeTable employees={employees} />
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="surface rounded-lg p-5">
      <Icon aria-hidden className="h-6 w-6 text-red-600" />
      <p className="mt-4 text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-zinc-950">{value}</p>
    </div>
  );
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  return (
    <div className="surface overflow-hidden rounded-lg">
      <TableTitle icon={Building2} title="Employees visibles" />
      <div className="scrollbar-thin overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Departement</TableHead>
              <TableHead>Division</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-bold">{fullName(employee)}</TableCell>
                <TableCell>{employee.title}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.division}</TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && <EmptyRow columns={4} />}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NominationTable({
  title,
  nominations,
  showComments = true
}: {
  title: string;
  nominations: Nomination[];
  showComments?: boolean;
}) {
  return (
    <div className="surface overflow-hidden rounded-lg">
      <TableTitle icon={Award} title={title} count={nominations.length} />
      <div className="scrollbar-thin overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nominee</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Departement</TableHead>
              <TableHead>{showComments ? "Commentaires" : "Nombre commentaires"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nominations.map((nomination) => (
              <TableRow key={nomination.id}>
                <TableCell className="font-bold">{fullName(nomination.employee)}</TableCell>
                <TableCell>{monthLabel(nomination.month, nomination.year)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{nomination.department}</Badge>
                </TableCell>
                <TableCell>
                  {showComments ? (
                    <div className="grid max-w-2xl gap-2">
                      {uniqueById(nomination.comments).map((comment) => (
                        <p key={comment.id} className="text-sm text-zinc-600">
                          <span className="font-bold text-red-700">{comment.categoryLabel ?? comment.category}:</span>{" "}
                          {comment.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="soft">{uniqueById(nomination.comments).length}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {nominations.length === 0 && <EmptyRow columns={4} />}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ElectionTable({ title, elections }: { title: string; elections: Election[] }) {
  return (
    <div className="surface overflow-hidden rounded-lg">
      <TableTitle icon={Trophy} title={title} count={elections.length} />
      <div className="scrollbar-thin overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Departement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Raison</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elections.map((election) => (
              <TableRow key={election.id}>
                <TableCell className="font-bold">{fullName(election.employee)}</TableCell>
                <TableCell>{monthLabel(election.month, election.year)}</TableCell>
                <TableCell>{election.department}</TableCell>
                <TableCell>
                  <Badge variant={election.status === "elected" ? "default" : "soft"}>
                    {election.status === "elected" ? "Elected" : "HRBP"}
                  </Badge>
                </TableCell>
                <TableCell>{election.reason ?? "-"}</TableCell>
              </TableRow>
            ))}
            {elections.length === 0 && <EmptyRow columns={5} />}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TableTitle({ icon: Icon, title, count }: { icon: LucideIcon; title: string; count?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black text-zinc-950">{title}</h2>
      </div>
      {typeof count === "number" && <Badge variant="soft">{count}</Badge>}
    </div>
  );
}

function EmptyRow({ columns }: { columns: number }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="py-10 text-center text-sm font-semibold text-zinc-500">
        Aucune donnee.
      </TableCell>
    </TableRow>
  );
}
