const db = require('../config/firebase');

const getTenantInfo = async (req, res) => {
    try {
        const tenantInfo = await (await db.collection('tenant').doc('e6cq7lXUTzMqPZiyclqI').get()).data()
        return res.status(200).json(tenantInfo) 
    } catch (error) {
        return res.status(500).json(error.message)
    }
}

module.exports = getTenantInfo;