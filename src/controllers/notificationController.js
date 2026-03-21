const Notification = require('../models/Notification');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user.id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user.id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to create notification
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Check and trigger budget notifications
const checkBudgetNotification = async (userId) => {
  try {
    // Avoid circular dependency by requiring these here or having a shared helper
    const Income = require('../models/Income');
    const Expense = require('../models/Expense');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month + 1, 0);
    const lastDay = lastDayDate.getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const start = new Date(year, month, 1); // Date object for queries


    // 1. Monthly Recap Logic (Runs on the 1st day of each month)
    if (now.getDate() === 1) {
      const prevMonthDate = new Date(year, now.getMonth() - 1, 1);
      const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'long' });
      const prevYear = prevMonthDate.getFullYear();
      const recapTitle = `Monthly Recap: ${prevMonthName} ${prevYear} 📊`;

      // Check if we already sent this recap
      const existingRecap = await Notification.findOne({
        user: userId,
        title: recapTitle
      });

      if (!existingRecap) {
        // Calculate previous month's final budget
        const pStart = new Date(prevYear, prevMonthDate.getMonth(), 1);
        const pEnd = new Date(prevYear, prevMonthDate.getMonth() + 1, 0);
        const pStartStr = pStart.toISOString().split('T')[0];
        const pEndStr = pEnd.toISOString().split('T')[0];

        const pIncomes = await Income.find({ user: userId, date: { $gte: pStartStr, $lte: pEndStr } });
        const pExpenses = await Expense.find({ user: userId, date: { $gte: pStartStr, $lte: pEndStr } });
        
        const pTotalInc = pIncomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const pTotalExp = pExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const pFinalBudget = pTotalInc - pTotalExp;

        let message = `Your final budget for ${prevMonthName} was Rs. ${pFinalBudget.toLocaleString()}. `;
        if (pFinalBudget > 0) {
          message += "Great job staying in the green! Keep it up this month! 🚀";
        } else if (pFinalBudget < 0) {
          message += "You ended the month in a deficit. Let's aim for a better balance this month! 💪";
        } else {
          message += "You broke even! A solid start for the new month.";
        }

        await createNotification(userId, recapTitle, message, 'info');
      }
    }

    // 2. Real-time Budget Alert Logic
    const incomes = await Income.find({
      user: userId,
      date: { $gte: startStr, $lte: endStr },
    });

    const expenses = await Expense.find({
      user: userId,
      date: { $gte: startStr, $lte: endStr },
    });

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const budget = totalIncome - totalExpense;

    // Look for the latest real-time budget alert for this month
    // We use a specific prefix to avoid confusion with recaps or other notifications
    const lastAlert = await Notification.findOne({
      user: userId,
      title: { $regex: '^Budget Alert:' },
      createdAt: { $gte: start }
    }).sort({ createdAt: -1 });


    if (budget < 0) {
      // If budget is negative and (never alerted OR last was success)
      if (!lastAlert || lastAlert.type === 'success') {
        const monthName = now.toLocaleString('default', { month: 'long' });
        await createNotification(
          userId,
          'Budget Alert: Your Balance is Low! 🛑',
          `Caution! Your expenses (Rs. ${totalExpense.toLocaleString()}) have surpassed your income for ${monthName}. Your current deficit is Rs. ${Math.abs(budget).toLocaleString()}. Let's spend carefully!`,
          'warning'
        );
      }
    } else if (budget > 0) {
      // Budget is positive. Only notify if we previously warned about negative
      if (lastAlert && lastAlert.type === 'warning') {
        const monthName = now.toLocaleString('default', { month: 'long' });
        await createNotification(
          userId,
          'Budget Alert: Back in the Green! ✨',
          `Great news! Your budget for ${monthName} is now positive again (Rs. ${budget.toLocaleString()}). Keep up the great financial management!`,
          'success'
        );
      }
    }
  } catch (error) {
    console.error('Error in checkBudgetNotification:', error);
  }
};

// Check for monthly summary notification (run on dashboard load)
const checkMonthlySummary = async (userId) => {
  try {
    const Income = require('../models/Income');
    const Expense = require('../models/Expense');

    const now = new Date();
    // Get last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = `${lastMonth.getMonth() + 1}`.padStart(2, '0');
    const monthStr = `${year}-${month}`;
    const start = `${monthStr}-01`;
    const end = `${monthStr}-31`;

    const monthName = lastMonth.toLocaleString('default', { month: 'long' });

    // Check if summary already exists for this last month
    const summaryExists = await Notification.findOne({
      user: userId,
      title: { $regex: `Monthly Summary for ${monthName}` }
    });

    if (summaryExists) return;

    const incomes = await Income.find({
      user: userId,
      date: { $gte: start, $lte: end },
    });

    const expenses = await Expense.find({
      user: userId,
      date: { $gte: start, $lte: end },
    });

    // Only create if there was activity
    if (incomes.length === 0 && expenses.length === 0) return;

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const budget = totalIncome - totalExpense;

    await createNotification(
      userId,
      `Monthly Summary for ${monthName} ${year}`,
      `Last month you earned Rs. ${totalIncome.toLocaleString()} and spent Rs. ${totalExpense.toLocaleString()}. Your net budget was Rs. ${budget.toLocaleString()}.`,
      budget >= 0 ? 'success' : 'warning'
    );
  } catch (error) {
    console.error('Error in checkMonthlySummary:', error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  checkBudgetNotification,
  checkMonthlySummary,
};
