const { createProduct, deleteProduct, editProduct, fetchProducts, addToFavorites, addToCart, findProductByQrCode } = require('../services/productService');


async function addProduct(req, res) {
    try {
        // req.files is now an object with keys 'images' and 'videos'
        const imageFiles = req.files.images || [];
        const videoFiles = req.files.videos || [];

        // Add costPrice to the data passed to the service
        const data = req.body;

        const newProduct = await createProduct(data, imageFiles, videoFiles);
        res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (err) {
        console.error("Create Product Error:", err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
}



async function removeProduct(req, res) {
    try {
        const { id } = req.params;
        const result = await deleteProduct(Number(id));
        return res.status(200).json({ message: 'Product deleted successfully', product: result });
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
}

async function changeProduct(req, res) {
    const { id } = req.params;
    try {
        const imageFiles = req.files.images || [];
        const videoFiles = req.files.videos || [];
        const data = req.body;

        const updatedProduct = await editProduct(id, data, imageFiles, videoFiles);
        res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        console.error("Update Product Error:", err);
        res.status(500).json({ error: 'Failed to update product.' });
    }
}

async function getProducts(req, res) {
    try {
        const { category, withVideos } = req.query;

        const products = await fetchProducts(category, withVideos === 'true');

        return res.status(200).json({ products });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function AddToFavorites(req, res) {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId);

    const result = await addToFavorites(userId, productId);
    res.json({ message: 'Product added to favorites', result });
}

async function AddToCart(req, res) {
    try {
        const userId = req.user.id;
        const { productId, quantity, transactionType } = req.body;

        if (!productId) {
            return res.status(400).json({ error: "Product ID is required" });
        }

        const result = await addToCart(userId, Number(productId), quantity ?? 1, transactionType);
        return res.status(200).json({
            message: result,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function getProductByQrCode(req, res) {
    // The full QR code content is sent as a query parameter named 'code'.
    // e.g., /by-qrcode?code=https://.../products/123
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'The "code" query parameter is required.' });
    }

    try {
        const product = await findProductByQrCode(code);
        res.status(200).json(product);
    } catch (err) {
        // Handle specific errors from the service with appropriate status codes.
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Invalid')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'An error occurred while finding the product.' });
    }
}

module.exports = {
    addProduct,
    removeProduct,
    changeProduct,
    getProducts,
    AddToFavorites,
    AddToCart,
    getProductByQrCode,
};
