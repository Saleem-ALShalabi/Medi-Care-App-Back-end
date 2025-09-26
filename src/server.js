const express = require('express');
const app = express();
const PORT = process.env.PORT || 8383;
//const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const orderRoutes = require('./routes/order');
const maintenanceRoutes = require('./routes/maintenance');
const reportRoutes = require('./routes/report');
const adverstimenetRoutes = require('./routes/advertisement');
const paymentRoutes = require('./routes/payment');
app.use(
    '/api/payments/stripe-webhook',
    express.raw({ type: 'application/json' })
);
//app.use(cors());
app.use(express.json());
//app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/advertisements', adverstimenetRoutes);
app.use('/api/payments', paymentRoutes);


app.listen(PORT, () => console.log(`Server is running on port:${PORT}`));