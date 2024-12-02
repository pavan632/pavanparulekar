const express = require('express');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// Initialize express app
const app = express();
app.use(express.json());

// In-memory storage for expenses
let expenses = [];
let predefinedCategories = ["Food", "Travel", "Entertainment", "Utilities", "Health", "Education"];

// Utility function to validate expenses
function isValidExpense(expense) {
  const { category, amount, date } = expense;
  return predefinedCategories.includes(category) && !isNaN(amount) && amount > 0 && new Date(date).toString() !== "Invalid Date";
}

// 1. Add a new expense (POST /expenses)
app.post('/expenses', (req, res) => {
  const { category, amount, date } = req.body;

  // Validate expense data
  if (!category || !amount || !date || !isValidExpense(req.body)) {
    return res.status(400).json({ status: 'error', data: null, error: 'Invalid expense data' });
  }

  const expense = {
    id: uuidv4(),
    category,
    amount,
    date: new Date(date)
  };

  expenses.push(expense);
  res.status(201).json({ status: 'success', data: expense, error: null });
});

// 2. Get expenses (GET /expenses) with optional filters
app.get('/expenses', (req, res) => {
  const { category, startDate, endDate } = req.query;
  let filteredExpenses = [...expenses];

  // Filter by category
  if (category && predefinedCategories.includes(category)) {
    filteredExpenses = filteredExpenses.filter(exp => exp.category === category);
  }

  // Filter by date range (if provided)
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.toString() !== "Invalid Date" && end.toString() !== "Invalid Date") {
      filteredExpenses = filteredExpenses.filter(exp => new Date(exp.date) >= start && new Date(exp.date) <= end);
    } else {
      return res.status(400).json({ status: 'error', data: null, error: 'Invalid date range' });
    }
  }

  res.status(200).json({ status: 'success', data: filteredExpenses, error: null });
});

// 3. Analyze spending patterns (GET /expenses/analysis)
app.get('/expenses/analysis', (req, res) => {
  // Total by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0;
    }
    acc[expense.category] += expense.amount;
    return acc;
  }, {});

  // Highest spending category
  const highestSpendingCategory = Object.entries(categoryTotals).reduce((max, curr) => curr[1] > max[1] ? curr : max, ["", 0]);

  // Monthly totals
  const monthlyTotals = expenses.reduce((acc, expense) => {
    const monthYear = ${expense.date.getMonth() + 1}-${expense.date.getFullYear()};
    if (!acc[monthYear]) {
      acc[monthYear] = 0;
    }
    acc[monthYear] += expense.amount;
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      categoryTotals,
      highestSpendingCategory: { category: highestSpendingCategory[0], amount: highestSpendingCategory[1] },
      monthlyTotals
    },
    error: null
  });
});

// 4. CRON job to generate summary (Weekly and Monthly reports)
cron.schedule('0 0 * * 0', () => { // Every Sunday at midnight
  const weeklySummary = generateSummary('week');
  console.log('Weekly Summary:', weeklySummary);
});

cron.schedule('0 0 1 * *', () => { // Every 1st day of the month at midnight
  const monthlySummary = generateSummary('month');
  console.log('Monthly Summary:', monthlySummary);
});

// Function to generate a summary (weekly or monthly)
function generateSummary(period) {
  const now = new Date();
  let startDate;

  if (period === 'week') {
    // Get the start of the current week (Sunday)
    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
  } else if (period === 'month') {
    // Get the start of the current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const filteredExpenses = expenses.filter(exp => new Date(exp.date) >= startDate);

  // Summarize total spending for this period
  const total = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  return { period, total, expenses: filteredExpenses.length };
}

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(Expense Tracker API running on port ${PORT});
});