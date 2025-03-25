const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const filterData = (req) => {
  let $where = {
    deleted_at: null,
  };

  if (req.query.id) {
    $where["id"] = parseInt(req.query.id);
  }

  if (req.query.name_short) {
    $where["name_short"] = req.query.name_short;
  }

  if (req.query.lang && req.query.lang == "en") {
    $where["name_en"] = {
      not: null,
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
  let $count = await prisma.equipment_department.findMany({
    where: $where,
  });

  $count = $count.length;
  let $perPage = req.query.perPage ? Number(req.query.perPage) : 10;
  let $currentPage = req.query.currentPage ? Number(req.query.currentPage) : 1;
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
  is_publish: true,
  name: true,
  contact_us_th: true,
  contact_us_en: true,
};

const checkLanguage = (req) => {
  let prismaLang = prisma.$extends({
    result: {
      equipment_department: {
        name: {
          needs: { name_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.name_en
              : table.name_th;
          },
        },
      },
    },
  });

  return prismaLang;
};

const methods = {
  async onGetAll(req, res) {
    try {
      let $where = filterData(req);
      let other = await countDataAndOrder(req, $where);

      let prismaLang = checkLanguage(req);

      const item = await prismaLang.equipment_department.findMany({
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
        lang: req.query.lang ? req.query.lang : "",
        msg: " success",
      });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },

  async onGetById(req, res) {
    try {
      let prismaLang = checkLanguage(req);
      const item = await prismaLang.equipment_department.findUnique({
        select: selectField,
        where: {
          id: Number(req.params.id),
        },
      });

      res.status(200).json({
        data: item,
        msg: " success",
      });
    } catch (error) {
      res.status(404).json({ msg: error.message });
    }
  },

  // สร้าง
  async onCreate(req, res) {
    try {
      const item = await prisma.equipment_department.create({
        data: {
          name_th: req.body.name_th,
          name_en: req.body.name_en,
          name_short: req.body.name_short,
          contact_us_th: req.body.contact_us_th,
          contact_us_en: req.body.contact_us_en,
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
      const item = await prisma.equipment_department.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          name_th: req.body.name_th != null ? req.body.name_th : undefined,
          name_en: req.body.name_en != null ? req.body.name_en : undefined,
          name_short:
            req.body.name_short != null ? req.body.name_short : undefined,
          contact_us_th:
            req.body.contact_us_th != null ? req.body.contact_us_th : undefined,
          contact_us_en:
            req.body.contact_us_en != null ? req.body.contact_us_en : undefined,
          is_publish: Number(req.body.is_publish),
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
      await prisma.equipment_department.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          deleted_at: new Date().toISOString(),
        },
      });

      res.status(200).json({
        msg: "success",
      });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };
