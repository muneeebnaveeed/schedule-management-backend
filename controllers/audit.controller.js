const mongoose = require('mongoose');
const _ = require('lodash');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

const getPrices = async (distinctProducts) => {
    let totalSellPrice = 0;
    let totalCostPrice = 0;
    distinctProducts.forEach((p) => {
        totalSellPrice += p.amount;
        totalCostPrice += p.costPrice;
    });
    return { totalSellPrice, totalCostPrice };
};
const getExpenses = async (startDate, endDate) => {
    let [rawMaterialExpenses, shopExpenses, salariesExpenses, bills, refundBills] = await Promise.all([
        await mongoose.model('RawMaterialExpenses').aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate } },
            },
            { $group: { _id: null, price: { $sum: '$price' } } },
        ]),
        await mongoose.model('ShopExpenses').aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate } },
            },
            { $group: { _id: null, price: { $sum: '$price' } } },
        ]),
        await mongoose.model('SalariesExpense').aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate } },
            },
            { $group: { _id: null, price: { $sum: '$amount' } } },
        ]),
    ]);

    rawMaterialExpenses = rawMaterialExpenses[0]?.price || 0;
    shopExpenses = shopExpenses[0]?.price || 0;
    salariesExpenses = salariesExpenses[0]?.price || 0;
    const totalExpenses = rawMaterialExpenses + shopExpenses + salariesExpenses;
    return { rawMaterialExpenses, shopExpenses, salariesExpenses, totalExpenses };
};

const getEarningValues = async (totalSalePrice, totalExpenses, totalCostPrice) => ({
    totalEarningVal1: totalSalePrice - totalExpenses,
    totalEarningVal2: totalSalePrice - totalCostPrice,
});

const getProducts = async (startDate, endDate) => {
    const getOriginalProducts = async () => {
        const bills = await mongoose
            .model('Bill')
            .find({ createdAt: { $gte: startDate, $lte: endDate } })
            .lean();
        let dbOriginalProducts = [];
        if (bills) {
            bills.forEach((bill) => {
                dbOriginalProducts.push(
                    bill.products.map((p) => {
                        const amount = p.amount - p.amount * (bill.discountPercent / 100);
                        const costPricePerUnit = p.costPrice;
                        const costPrice = costPricePerUnit * p.qty;
                        return { ...p, amount, costPrice, costPricePerUnit };
                    })
                );
            });

            dbOriginalProducts = _.flattenDeep(dbOriginalProducts);

            const groupedOriginalProducts = [];
            for (const originalProduct of dbOriginalProducts) {
                const productIndex = groupedOriginalProducts.findIndex(
                    (p) => p._id.toString() === originalProduct._id.toString()
                );
                if (productIndex !== -1) {
                    const existingProduct = groupedOriginalProducts[productIndex];
                    existingProduct.qty += originalProduct.qty;
                    existingProduct.amount += originalProduct.amount;
                    existingProduct.costPrice += originalProduct.costPricePerUnit * originalProduct.qty;
                } else {
                    groupedOriginalProducts.push(originalProduct);
                }
            }
            return groupedOriginalProducts;
        }
        return [];
    };

    const getRefundProducts = async () => {
        const refundBills = await mongoose
            .model('RefundBill')
            .find({ createdAt: { $gte: startDate, $lte: endDate } })
            .lean();
        if (refundBills) {
            let dbRefundProducts = [];

            refundBills.forEach((refundBill) => {
                dbRefundProducts.push(
                    refundBill.products.map((p) => {
                        const costPricePerUnit = p.costPrice;
                        const costPrice = costPricePerUnit * p.qty;
                        return { ...p, costPrice, costPricePerUnit };
                    })
                );
            });

            dbRefundProducts = _.flattenDeep(dbRefundProducts);
            const groupedRefundProducts = [];

            for (const refundProduct of dbRefundProducts) {
                const productIndex = groupedRefundProducts.findIndex(
                    (p) => p._id.toString() === refundProduct._id.toString()
                );

                if (productIndex !== -1) {
                    const existingProduct = groupedRefundProducts[productIndex];
                    existingProduct.qty += refundProduct.qty;
                    existingProduct.amount += refundProduct.amount;
                    existingProduct.costPrice += refundProduct.costPricePerUnit * refundProduct.qty;
                } else {
                    groupedRefundProducts.push(refundProduct);
                }
            }
            return groupedRefundProducts;
        }
        return [];
    };

    const deductRefunds = (o, refunds) => {
        const originals = [...o];

        refunds.forEach((refundProduct) => {
            const originalProductIndex = originals.findIndex((e) => e._id.toString() === refundProduct._id.toString());

            if (originalProductIndex > -1) {
                originals[originalProductIndex].qty -= refundProduct.qty;
                originals[originalProductIndex].amount -= refundProduct.amount;
                originals[originalProductIndex].costPrice -= refundProduct.costPrice;
            }
        });

        return originals;
    };

    const [originalProducts, refundProducts] = await Promise.all([getOriginalProducts(), getRefundProducts()]);

    const deductedProducts = deductRefunds(originalProducts, refundProducts);

    return deductedProducts;
};
module.exports.getSalesReport = catchAsync(async function (req, res, next) {
    const { startDate, endDate } = req.query;
    const [expenses, products] = await Promise.all([getExpenses(startDate, endDate), getProducts(startDate, endDate)]);
    const [prices] = await Promise.all([getPrices(products)]);
    const earningValues = await getEarningValues(prices.totalSellPrice, expenses.totalExpenses, prices.totalCostPrice);
    res.status(200).send({ expenses, totalSales: products, prices, earningValues });
});

module.exports.getProfitLossReport = catchAsync(async function (req, res, next) {
    const {
        startDate,
        endDate,
        profit1 = 60,
        futureCost1 = 60,
        profit2 = 60,
        futureCost2 = 60,
        expense2 = 60,
    } = req.query;
    const [products, expenses] = await Promise.all([getProducts(startDate, endDate), getExpenses(startDate, endDate)]);
    const [prices] = await Promise.all([getPrices(products)]);
    const [earningValues] = await Promise.all([
        getEarningValues(prices.totalSellPrice, expenses.totalExpenses, prices.totalCostPrice),
    ]);
    res.status(200).send({
        totalSellPrice: prices.totalSellPrice,
        totalExpenses: expenses.totalExpenses,
        totalCostPrice: prices.totalCostPrice,
        totalEarningVal1: earningValues.totalEarningVal1,
        totalEarningVal2: earningValues.totalEarningVal2,
        companyProfitVal1: earningValues.totalEarningVal1 * profit1 * 0.01,
        companyFutureCostVal1: earningValues.totalEarningVal1 * futureCost1 * 0.01,
        companyProfitVal2: earningValues.totalEarningVal2 * profit2 * 0.01,
        companyFutureCostVal2: earningValues.totalEarningVal2 * futureCost2 * 0.01,
        companyExpenseVal2: earningValues.totalEarningVal2 * expense2 * 0.01,
    });
});
