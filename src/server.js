const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();


const app = express();

// MongoDB connect
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Test route
app.get("/", (req, res) => {
  res.send("BudgetWise API is running...");
});

// Auth routes
app.use("/api/auth", require("./routes/authRoutes"));

// Income routes
app.use('/api/income', require('./routes/incomeRoutes'));

// Expense routes
app.use('/api/expense', require('./routes/expenseRoutes'));

app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;