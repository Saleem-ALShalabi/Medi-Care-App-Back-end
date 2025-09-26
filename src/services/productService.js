const { prisma } = require('../config/prisma');
const qr = require('qrcode');
const fs = require('fs');
const path = require('path');

async function createProduct(data, imageFiles, videoFiles) {
    const images = imageFiles.map((file) => `/${file.path.replace(/\\/g, '/')}`);
    const videos = videoFiles.map((file) => ({
        name: file.originalname,
        bio: '', // You can add a 'bio' field to your form if needed
        url: `/${file.path.replace(/\\/g, '/')}`,
    }));

    // Step 1: Create the product record WITHOUT the QR code to get its ID.
    const newProduct = await prisma.Product.create({
        data: {
            nameEn: data.nameEn,
            nameAr: data.nameAr,
            costPrice: Number(data.costPrice), // <-- ADDED COST PRICE
            company: data.company,
            category: data.category,
            description: data.description,
            rate: Number(data.rate) || 0,
            rentPrice: Number(data.rentPrice) || null,
            sellPrice: Number(data.sellPrice) || null,
            availableForRent: data.availableForRent === 'true',
            availableForSale: data.availableForSale === 'true',
            rentStock: Number(data.rentStock) || 0,
            saleStock: Number(data.saleStock) || 0,
            images,
            videos: {
                create: videos,
            },
        },
        include: {
            videos: true,
        },
    });

    // Step 2: Generate and save the QR code image using the new product's ID.
    // The QR code will contain a URL to the product page on your future frontend.
    const qrCodeContent = `https://your-app-domain.com/products/${newProduct.id}`;
    const qrCodeDir = path.join(__dirname, '..', 'uploads', 'qrcodes');

    // Ensure the qrcodes directory exists
    if (!fs.existsSync(qrCodeDir)) {
        fs.mkdirSync(qrCodeDir, { recursive: true });
    }

    const qrCodeFileName = `product-${newProduct.id}.png`;
    const qrCodeFilePath = path.join(qrCodeDir, qrCodeFileName);
    const qrCodeUrlPath = `/uploads/qrcodes/${qrCodeFileName}`;

    try {
        await qr.toFile(qrCodeFilePath, qrCodeContent);
        console.log(`Successfully generated QR code for product ${newProduct.id}`);

        // Step 3: Update the product with the path to its new QR code.
        const productWithQr = await prisma.Product.update({
            where: { id: newProduct.id },
            data: { qrCode: qrCodeUrlPath },
            include: { videos: true }, // Re-include videos for the final response
        });

        return productWithQr;

    } catch (err) {
        console.error('Failed to generate QR code or update product:', err);
        // If QR generation fails, we should still return the product but log the error.
        // The admin can regenerate it later.
        return newProduct;
    }
}


async function deleteProduct(id) {
    const existing = await prisma.Product.findUnique({ where: { id } });
    if (!existing) throw new Error('Product not found');

    await prisma.ProductVideo.deleteMany({
        where: { productId: id },
    });

    const deleted = await prisma.Product.delete({ where: { id } });
    return deleted;
}

async function editProduct(productId, data, newImageFiles, newVideoFiles) {
    const numericId = Number(productId);

    const existingProduct = await prisma.Product.findUnique({ where: { id: numericId } });
    if (!existingProduct) {
        throw new Error('Product not found');
    }

    const updateData = {};
    if (data.nameEn) updateData.nameEn = data.nameEn;
    if (data.nameAr) updateData.nameAr = data.nameAr;
    if (data.costPrice) updateData.costPrice = Number(data.costPrice);
    if (data.sellPrice) updateData.sellPrice = Number(data.sellPrice);
    if (data.rentPrice) updateData.rentPrice = Number(data.rentPrice);
    if (data.saleStock) updateData.saleStock = Number(data.saleStock);
    if (data.rentStock) updateData.rentStock = Number(data.rentStock);
    if (data.company) updateData.company = data.company;
    if (data.category) updateData.category = data.category;
    if (data.description) updateData.description = data.description;
    if (data.availableForSale !== undefined) updateData.availableForSale = data.availableForSale === 'true';
    if (data.availableForRent !== undefined) updateData.availableForRent = data.availableForRent === 'true';

    let finalImages = [...existingProduct.images]; // Start with the old images
    if (newImageFiles && newImageFiles.length > 0) {
        const newImagePaths = newImageFiles.map(file => `/${file.path.replace(/\\/g, '/')}`);
        finalImages.push(...newImagePaths); // Add the new paths to the array
    }
    updateData.images = finalImages;


    if (newVideoFiles && newVideoFiles.length > 0) {
        const newVideosData = newVideoFiles.map(file => ({
            name: file.originalname,
            bio: '',
            url: `/${file.path.replace(/\\/g, '/')}`,
        }));

        updateData.videos = {
            create: newVideosData,
        };
    }

    let updatedProduct = await prisma.Product.update({
        where: { id: numericId },
        data: updateData,
        include: { videos: true },
    });

    // Optional: Regenerate QR Code if a critical field (like name) changes.
    // add a query param like `?regenerateQR=true`.

    return updatedProduct;
}

async function fetchProducts(category, withVideos = false) {
    const where = category ? { category } : {};

    const products = await prisma.Product.findMany({
        where,
        include: {
            videos: withVideos
                ? {
                    select: {
                        id: true,
                        name: true,
                        bio: true,
                        url: true,
                    },
                }
                : false, // Don't include videos if not requested
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return products;
}


async function addToFavorites(userId, productId) {
    return await prisma.Users.update({
        where: { id: userId },
        data: {
            favorites: {
                connect: { id: productId }
            }
        },
        include: { favorites: true }
    });
}

async function addToCart(userId, productId, quantity = 1, transactionType) {
    try {
        if (!Number.isInteger(quantity) || quantity < 0)
            throw new Error("Invalid quantity");
        const product = await prisma.Product.findUnique({
            where: { id: productId },
            select: { id: true },
        });
        if (!product) throw new Error("Product not found");
        //check the stock first
        const stock = transactionType === 'SALE' ? product.saleStock : product.rentStock;
        if (stock < quantity) {
            throw new Error(`Not enough stock. Only ${stock} units available.`);
        }
        if (quantity === 0) {
            const existing = await prisma.CartItem.findUnique({
                where: { userId_productId: { userId, productId } },
            });
            if (!existing) return "Product not found in cart, nothing to remove.";
            await prisma.CartItem.delete({
                where: { userId_productId: { userId, productId } },
            });
            return "Product removed from cart.";
        }

        const existing = await prisma.CartItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (existing) {
            return await prisma.CartItem.update({
                where: { userId_productId: { userId, productId } },
                data: { quantity },
            });
        }

        return await prisma.CartItem.create({
            data: { userId, productId, quantity, transactionType },
        });
    } catch (err) {
        throw new Error(err?.message || "Could not add to cart");
    }
}

async function findProductByQrCode(qrCodeUrl) {
    // 1. Basic validation of the input.
    if (!qrCodeUrl || typeof qrCodeUrl !== 'string') {
        throw new Error('Invalid or missing QR code content.');
    }

    // 2. Parse the URL to extract the product ID.
    // This logic assumes the URL format is '.../products/ID'.
    const urlParts = qrCodeUrl.split('/');
    const productId = urlParts.pop() || ''; // Get the last part of the URL.

    const numericId = Number(productId);
    
    // Check if the extracted ID is a valid number.
    if (isNaN(numericId) || numericId <= 0) {
        throw new Error('Invalid QR code format: Could not extract a valid product ID.');
    }

    // 3. Find the product in the database using the extracted ID.
    const product = await prisma.Product.findUnique({
        where: { id: numericId },
        include: {
            videos: true, // Include all relevant product details
        }
    });

    if (!product) {
        throw new Error('Product not found for the given QR code.');
    }

    return product;
}

module.exports = {
    createProduct,
    deleteProduct,
    editProduct,
    fetchProducts,
    addToFavorites,
    addToCart,
    findProductByQrCode,
};
