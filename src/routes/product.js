const express = require('express');
const router = express.Router();
const requireRole = require('../middlewares/requireRole');
const requireLogin = require('../middlewares/requireLogin');
const validate = require('../middlewares/validateProductInput');
const { createProductSchema, editProductSchema } = require('../utils/validationSchemas');
const { addProduct, removeProduct, changeProduct, getProducts, AddToFavorites, AddToCart, getProductByQrCode } = require('../controllers/productController');
const upload = require('../middlewares/upload');


const productUploads = upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
]);

router.post('/add-product', requireLogin, requireRole('ADMIN'), productUploads, validate(createProductSchema), addProduct);
router.delete('/delete-product/:id', requireRole('ADMIN'), removeProduct);
router.patch('/edit-product/:id', requireLogin, requireRole('ADMIN'), productUploads, validate(editProductSchema), changeProduct);
router.get('/find-by-qrcode', requireLogin, getProductByQrCode);
router.get('/get-products', getProducts);
router.post('/add-to-favorites/:productId', requireLogin, AddToFavorites);
router.post('/add-to-cart', requireLogin, AddToCart);

module.exports = router;