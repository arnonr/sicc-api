const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ค้นหา
const filterData = (req) => {
    let $where = {
        deleted_at: null,
    };

    if (req.query.id) {
        $where["id"] = parseInt(req.query.id);
    }

    if (req.query.lang && req.query.lang == "en") {
        $where["name_en"] = {
            not: null,
            not: "",
        };
    }

    if (req.query.name_th) {
        $where["name_th"] = {
            contains: req.query.name_th,
            //   mode: "insensitive",
        };
    }

    if (req.query.name_en) {
        $where["name_en"] = {
            contains: req.query.name_en,
            //   mode: "insensitive",
        };
    }

    if (req.query.name) {
        if (req.query.lang && req.query.lang == "th") {
            $where["name_th"] = {
                contains: req.query.name,
            };
        } else {
            $where["name_en"]["contains"] = req.query.name;
        }
    }

    if (req.query.name_short) {
        $where["name_short"] = {
            contains: req.query.name_short,
            //   mode: "insensitive",
        };
    }

    if (req.query.equipment_id) {
        $where["equipment_id"] = parseInt(req.query.equipment_id);
    }

    if (req.query.is_publish) {
        $where["is_publish"] = parseInt(req.query.is_publish);
    }

    return $where;
};

// หาจำนวนทั้งหมดและลำดับ
const countDataAndOrder = async (req, $where) => {
    //   Order
    let $orderBy = {};
    if (req.query.orderBy) {
        $orderBy[req.query.orderBy] = req.query.order;
    } else {
        $orderBy = { created_at: "asc" };
    }

    //Count
    let $count = await prisma.equipment_method.findMany({
        where: $where,
    });

    $count = $count.length;
    let $perPage = req.query.perPage ? Number(req.query.perPage) : 10;
    let $currentPage = req.query.currentPage
        ? Number(req.query.currentPage)
        : 1;
    let $totalPage =
        Math.ceil($count / $perPage) == 0 ? 1 : Math.ceil($count / $perPage);
    let $offset = $perPage * ($currentPage - 1);

    return {
        $orderBy: $orderBy,
        $offset: $offset,
        $perPage: $perPage,
        $count: $count,
        $totalPage: $totalPage,
        $currentPage: $currentPage,
    };
};

// ฟิลด์ที่ต้องการ Select รวมถึง join
const selectField = {
    id: true,
    name_th: true,
    name_en: true,
    name_short: true,
    unit_th: true,
    unit_en: true,
    equipment_id: true,
    price: true,
    is_publish: true,
    is_fixrate: true,
    member1_price: true,
    member2_price: true,
    member3_price: true,
    member4_price: true,
    member5_price: true,
    name: true,
    unit: true,
};

// ปรับ Language
const checkLanguage = (req) => {
    let prismaLang = prisma.$extends({
        result: {
            equipment_method: {
                name: {
                    needs: { name_th: true },
                    compute(table) {
                        return req.query.lang && req.query.lang == "en"
                            ? table.name_en
                            : table.name_th;
                    },
                },
                unit: {
                    needs: { unit_th: true },
                    compute(table) {
                        return req.query.lang && req.query.lang == "en"
                            ? table.unit_en
                            : table.unit_th;
                    },
                },
            },
        },
    });

    return prismaLang;
};

const methods = {
    // ค้นหาทั้งหมด
    async onGetAll(req, res) {
        try {
            let $where = filterData(req);
            let other = await countDataAndOrder(req, $where);

            let prismaLang = checkLanguage(req);

            const item = await prismaLang.equipment_method.findMany({
                select: selectField,
                where: $where,
                orderBy: other.$orderBy,
                skip: other.$offset,
                take: other.$perPage,
            });

            res.status(200).json({
                data: item,
                totalData: other.$count,
                totalPage: other.$totalPage,
                currentPage: other.$currentPage,
                msg: "success",
            });
        } catch (error) {
            res.status(500).json({ msg: error.message });
        }
    },
    // ค้นหาเรคคอร์ดเดียว
    async onGetById(req, res) {
        try {
            let prismaLang = checkLanguage(req);
            const item = await prismaLang.equipment_method.findUnique({
                select: selectField,
                where: {
                    id: Number(req.params.id),
                },
            });
            res.status(200).json({ data: item, msg: " success" });
        } catch (error) {
            res.status(404).json({ msg: error.message });
        }
    },

    // สร้าง
    async onCreate(req, res) {
        try {
            const item = await prisma.equipment_method.create({
                data: {
                    equipment_id: Number(req.body.equipment_id),
                    name_th: req.body.name_th,
                    name_en: req.body.name_en,
                    name_short: req.body.name_short,
                    is_fixrate: Number(req.body.is_fixrate),
                    unit_th: req.body.unit_th,
                    unit_en: req.body.unit_en,
                    price: Number(req.body.price),
                    member1_price: Number(req.body.member1_price),
                    member2_price: Number(req.body.member2_price),
                    member3_price: Number(req.body.member3_price),
                    member4_price: Number(req.body.member4_price),
                    member5_price: Number(req.body.member5_price),
                    is_publish: Number(req.body.is_publish),
                    created_by: "arnonr",
                    updated_by: "arnonr",
                },
            });

            res.status(201).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    // แก้ไข
    async onUpdate(req, res) {
        try {
            const item = await prisma.equipment_method.update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    name_th:
                        req.body.name_th != null ? req.body.name_th : undefined,
                    name_en:
                        req.body.name_en != null ? req.body.name_en : undefined,
                    name_short:
                        req.body.name_short != null
                            ? req.body.name_short
                            : undefined,
                    equipment_id:
                        req.body.equipment_id != null
                            ? Number(req.body.equipment_id)
                            : undefined,
                    unit_th:
                        req.body.unit_th != null ? req.body.unit_th : undefined,
                    unit_en:
                        req.body.unit_en != null ? req.body.unit_en : undefined,
                    is_publish:
                        req.body.is_publish != null
                            ? Number(req.body.is_publish)
                            : undefined,
                    is_fixrate:
                        req.body.is_fixrate != null
                            ? Number(req.body.is_fixrate)
                            : undefined,
                    price:
                        req.body.price != null
                            ? Number(req.body.price)
                            : undefined,
                    member1_price:
                        req.body.member1_price != null
                            ? Number(req.body.member1_price)
                            : undefined,
                    member2_price:
                        req.body.member2_price != null
                            ? Number(req.body.member2_price)
                            : undefined,
                    member3_price:
                        req.body.member3_price != null
                            ? Number(req.body.member3_price)
                            : undefined,
                    member4_price:
                        req.body.member4_price != null
                            ? Number(req.body.member4_price)
                            : undefined,
                    member5_price:
                        req.body.member5_price != null
                            ? Number(req.body.member5_price)
                            : undefined,
                    updated_by: "arnonr",
                },
            });

            res.status(200).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },
    // ลบ
    async onDelete(req, res) {
        try {
            const item = await prisma.equipment_method.update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    deleted_at: new Date().toISOString(),
                },
            });

            res.status(200).json({ msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },
};

module.exports = { ...methods };
