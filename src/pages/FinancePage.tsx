import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { Badge, EmptyState } from '../components/ui/Small';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants';
import { currency } from '../lib/date';
import type { Budget, SavingsGoal, Transaction, TransactionType } from '../types';

export function FinancePage() {
  const { data, loading, error, refresh, createTransaction, updateTransaction, deleteTransaction, createBudget, updateBudget, deleteBudget, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useData();
  const { toast } = useToast();
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionDraft, setTransactionDraft] = useState({ type: 'expense' as TransactionType, amount: '', category: 'Food', description: '', transaction_date: new Date().toISOString().slice(0, 10), payment_method: 'Cash' });
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetDraft, setBudgetDraft] = useState({ category: 'Food', amount_limit: '' });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalDraft, setGoalDraft] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '' });

  const transactions = data?.transactions ?? [];
  const budgets = data?.budgets ?? [];
  const goals = data?.savingsGoals ?? [];

  const summary = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter((transaction) => transaction.transaction_date.slice(0, 7) === monthKey);
    const income = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    const balance = transactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0) - transactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
    return { income, expenses, balance };
  }, [transactions]);

  const chartData = useMemo(() => [
    { name: 'Income', value: Number(summary.income.toFixed(2)) },
    { name: 'Expenses', value: Number(summary.expenses.toFixed(2)) },
  ], [summary]);

  const saveTransaction = async () => {
    const amount = Number(transactionDraft.amount);
    if (!amount || amount <= 0) {
      toast('Enter a valid amount greater than zero.', 'error');
      return;
    }
    const values = {
      type: transactionDraft.type,
      amount,
      category: transactionDraft.category,
      description: transactionDraft.description,
      transaction_date: transactionDraft.transaction_date,
      payment_method: transactionDraft.payment_method,
    };
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, values);
        toast('Transaction updated.', 'success');
      } else {
        await createTransaction(values);
        toast('Transaction recorded.', 'success');
      }
      setTransactionModalOpen(false);
      setEditingTransaction(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Transaction could not be saved.', 'error');
    }
  };

  const saveBudget = async () => {
    const amountLimit = Number(budgetDraft.amount_limit);
    if (!amountLimit || amountLimit <= 0) {
      toast('Enter a valid budget amount.', 'error');
      return;
    }
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, { category: budgetDraft.category, amount_limit: amountLimit, period_month: new Date().toISOString().slice(0, 7) });
        toast('Budget updated.', 'success');
      } else {
        await createBudget({ category: budgetDraft.category, amount_limit: amountLimit, period_month: new Date().toISOString().slice(0, 7) });
        toast('Budget created.', 'success');
      }
      setBudgetModalOpen(false);
      setEditingBudget(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Budget could not be saved.', 'error');
    }
  };

  const saveGoal = async () => {
    const targetAmount = Number(goalDraft.target_amount);
    const currentAmount = Number(goalDraft.current_amount || '0');
    if (!goalDraft.name.trim() || !targetAmount || targetAmount <= 0) {
      toast('Enter a goal name and valid target amount.', 'error');
      return;
    }
    try {
      const values = { name: goalDraft.name.trim(), target_amount: targetAmount, current_amount: currentAmount, target_date: goalDraft.target_date || null, color: '#7857f6', icon: 'target', completed: currentAmount >= targetAmount };
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, values);
        toast('Savings goal updated.', 'success');
      } else {
        await createSavingsGoal(values);
        toast('Savings goal created.', 'success');
      }
      setGoalModalOpen(false);
      setEditingGoal(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Savings goal could not be saved.', 'error');
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    try {
      await deleteTransaction(deletingTransaction.id);
      toast('Transaction deleted.', 'success');
      setDeletingTransaction(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Transaction could not be deleted.', 'error');
    }
  };

  const expensesByCategory = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const totals = new Map<string, number>();
    for (const transaction of transactions.filter((item) => item.type === 'expense' && item.transaction_date.slice(0, 7) === monthKey)) {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    }
    return [...totals.entries()].map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (loading) return <div className="card h-96 animate-pulse rounded-2xl" />;
  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-display font-bold">Finance could not load</h2>
        <p className="mt-2 text-sm text-muted">{error ?? 'Your finance data is unavailable.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => void refresh()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Finance</h2>
          <p className="text-sm text-muted">Track personal income and expenses. Amounts are user-entered estimates, not banking records.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingTransaction(null); setTransactionDraft({ type: 'expense', amount: '', category: 'Food', description: '', transaction_date: new Date().toISOString().slice(0, 10), payment_method: 'Cash' }); setTransactionModalOpen(true); }}><Plus className="h-4 w-4" /> Add transaction</Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current balance</p>
          <p className="mt-2 text-4xl font-display font-bold">{currency(summary.balance, data.profile.currency)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-soft p-3"><p className="text-xs text-muted">Income</p><p className="font-display font-bold text-emerald-500">{currency(summary.income, data.profile.currency)}</p></div>
            <div className="rounded-2xl bg-surface-soft p-3"><p className="text-xs text-muted">Expenses</p><p className="font-display font-bold text-amber-500">{currency(summary.expenses, data.profile.currency)}</p></div>
          </div>
        </div>
        <div className="card p-5 xl:col-span-2">
          <h3 className="font-display font-bold">Income vs expenses</h3>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="name" stroke="rgb(var(--muted))" fontSize={12} />
                <YAxis stroke="rgb(var(--muted))" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">Budgets</h3>
            <p className="text-sm text-muted">Monthly category spending limits.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setEditingBudget(null); setBudgetDraft({ category: 'Food', amount_limit: '' }); setBudgetModalOpen(true); }}><Plus className="h-4 w-4" /> New budget</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const spent = transactions.filter((transaction) => transaction.type === 'expense' && transaction.category === budget.category && transaction.transaction_date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((sum, transaction) => sum + transaction.amount, 0);
            const progress = Math.min(100, (spent / budget.amount_limit) * 100);
            return (
              <div key={budget.id} className="rounded-2xl border border-default p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{budget.category}</p>
                  <Badge tone={progress > 90 ? 'red' : progress > 70 ? 'amber' : 'green'}>{Math.round(progress)}%</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{currency(spent, data.profile.currency)} of {currency(budget.amount_limit, data.profile.currency)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-accent-500" style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingBudget(budget); setBudgetDraft({ category: budget.category, amount_limit: String(budget.amount_limit) }); setBudgetModalOpen(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => deleteBudget(budget.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
          {!budgets.length ? <EmptyState icon={<Plus className="h-6 w-6" />} title="No budgets yet" description="Set a monthly limit for a spending category." /> : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display font-bold">Transactions</h3>
          <div className="mt-4 space-y-2">
            {transactions.slice(0, 12).map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-3 rounded-xl border border-default p-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <Plus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{transaction.description || transaction.category}</p>
                  <p className="text-xs text-muted">{transaction.category} · {transaction.transaction_date}</p>
                </div>
                <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-500' : 'text-amber-500'}`}>{transaction.type === 'income' ? '+' : '-'}{currency(transaction.amount, data.profile.currency)}</p>
                <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setDeletingTransaction(transaction)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {!transactions.length ? <EmptyState icon={<Plus className="h-6 w-6" />} title="No transactions yet" description="Add your first income or expense." /> : null}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold">Spending by category</h3>
              <p className="text-sm text-muted">This month.</p>
            </div>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis type="number" stroke="rgb(var(--muted))" fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} stroke="rgb(var(--muted))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" name="Spent" fill="#7857f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">Savings goals</h3>
            <p className="text-sm text-muted">Track progress toward personal savings targets.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setEditingGoal(null); setGoalDraft({ name: '', target_amount: '', current_amount: '0', target_date: '' }); setGoalModalOpen(true); }}><Plus className="h-4 w-4" /> New goal</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <div key={goal.id} className="rounded-2xl border border-default p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{goal.name}</p>
                  <Badge tone={goal.completed ? 'green' : 'accent'}>{goal.completed ? 'Funded' : `${Math.round(progress)}%`}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{currency(goal.current_amount, data.profile.currency)} of {currency(goal.target_amount, data.profile.currency)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: goal.color }} /></div>
              </div>
            );
          })}
          {!goals.length ? <EmptyState icon={<Plus className="h-6 w-6" />} title="No savings goals yet" /> : null}
        </div>
      </section>

      <Modal open={transactionModalOpen} title={editingTransaction ? 'Edit transaction' : 'Add transaction'} onClose={() => setTransactionModalOpen(false)} widthClass="max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={transactionDraft.type} onChange={(event) => { const type = event.target.value as TransactionType; setTransactionDraft((current) => ({ ...current, type, category: type === 'income' ? 'Salary' : 'Food' })); }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </Field>
            <Field label="Amount">
              <Input type="number" min="0" step="0.01" value={transactionDraft.amount} onChange={(event) => setTransactionDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="125.00" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={transactionDraft.category} onChange={(event) => setTransactionDraft((current) => ({ ...current, category: event.target.value }))}>
                {(transactionDraft.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={transactionDraft.transaction_date} onChange={(event) => setTransactionDraft((current) => ({ ...current, transaction_date: event.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={2} value={transactionDraft.description} onChange={(event) => setTransactionDraft((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Payment method">
            <Input value={transactionDraft.payment_method} onChange={(event) => setTransactionDraft((current) => ({ ...current, payment_method: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setTransactionModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveTransaction()} disabled={!transactionDraft.amount || Number(transactionDraft.amount) <= 0}>Save transaction</Button>
          </div>
        </div>
      </Modal>

      <Modal open={budgetModalOpen} title={editingBudget ? 'Edit budget' : 'New budget'} onClose={() => setBudgetModalOpen(false)} widthClass="max-w-md">
        <div className="space-y-4">
          <Field label="Category">
            <Select value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))}>
              {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </Field>
          <Field label="Monthly limit">
            <Input type="number" min="0" step="0.01" value={budgetDraft.amount_limit} onChange={(event) => setBudgetDraft((current) => ({ ...current, amount_limit: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBudgetModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveBudget()} disabled={!budgetDraft.amount_limit || Number(budgetDraft.amount_limit) <= 0}>Save budget</Button>
          </div>
        </div>
      </Modal>

      <Modal open={goalModalOpen} title={editingGoal ? 'Edit savings goal' : 'New savings goal'} onClose={() => setGoalModalOpen(false)} widthClass="max-w-md">
        <div className="space-y-4">
          <Field label="Goal name">
            <Input value={goalDraft.name} onChange={(event) => setGoalDraft((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target amount">
              <Input type="number" min="0" step="0.01" value={goalDraft.target_amount} onChange={(event) => setGoalDraft((current) => ({ ...current, target_amount: event.target.value }))} />
            </Field>
            <Field label="Current amount">
              <Input type="number" min="0" step="0.01" value={goalDraft.current_amount} onChange={(event) => setGoalDraft((current) => ({ ...current, current_amount: event.target.value }))} />
            </Field>
          </div>
          <Field label="Target date">
            <Input type="date" value={goalDraft.target_date} onChange={(event) => setGoalDraft((current) => ({ ...current, target_date: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setGoalModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveGoal()} disabled={!goalDraft.target_amount || Number(goalDraft.target_amount) <= 0}>Save goal</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deletingTransaction)} title="Delete transaction" onClose={() => setDeletingTransaction(null)} widthClass="max-w-md">
        <p className="text-sm text-muted">Delete this transaction?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeletingTransaction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmDeleteTransaction()}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
