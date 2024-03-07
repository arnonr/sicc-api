const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const nodemailer = require("nodemailer");

// ค้นหา
const filterData = (req) => {
  let $where = {
    deleted_at: null,
  };

  if (req.query.id) {
    $where["id"] = parseInt(req.query.id);
  }

  if (req.query.lang && req.query.lang == "en") {
    $where["title_en"] = {
      not: null,
      not: "",
    };
  }

  if (req.query.title_th) {
    $where["title_th"] = {
      contains: req.query.title_th,
      //   mode: "insensitive",
    };
  }

  if (req.query.title_en) {
    $where["title_en"] = {
      contains: req.query.title_en,
      //   mode: "insensitive",
    };
  }

  if (req.query.title) {
    if (req.query.lang && req.query.lang == "th") {
      $where["title_th"] = {
        contains: req.query.title,
      };
    } else {
      $where["title_en"]["contains"] = req.query.title;
    }
  }

  if (req.query.is_publish) {
    $where["is_publish"] = parseInt(req.query.is_publish);
  }

  if (req.query.created_year) {
    $where["created_contact"] = {
      gte: new Date(req.query.created_year + "-01-01 00:00:00").toISOString(),
      lte: new Date(req.query.created_year + "-12-31 23:59:00").toISOString(),
    };
  }

  if (req.query.created_month) {
    $where["created_contact"] = {
      gte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-01 00:00:00"
      ).toISOString(),
      lte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-31 23:59:00"
      ).toISOString(),
    };
  }

  if (req.query.created_contact) {
    $where["created_contact"] = {
      gte: new Date(req.query.created_contact + " 00:00:00").toISOString(),
      lte: new Date(req.query.created_contact + " 23:59:00").toISOString(),
    };
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
    $orderBy = { id: "asc" };
  }

  //Count
  let $count = await prisma.direction.findMany({
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
  title_th: true,
  title_en: true,
  detail_th: true,
  detail_en: true,
  is_publish: true,
  count_views: true,
  created_contact: true,
  title: true,
  detail: true,
};

// ปรับ Language
const checkLanguage = (req) => {
  let prismaLang = prisma.$extends({
    result: {
      direction: {
        title: {
          needs: { title_th: true },
          compute(direction) {
            return req.query.lang && req.query.lang == "en"
              ? direction.title_en
              : direction.title_th;
          },
        },
        detail: {
          needs: { detail_th: true },
          compute(direction) {
            return req.query.lang && req.query.lang == "en"
              ? direction.detail_en
              : direction.detail_th;
          },
        },
      },
    },
  });

  return prismaLang;
};

const cutFroala = (detail) => {
  let detail_success =
    detail != null
      ? detail
          .replaceAll("Powered by", "")
          .replaceAll(
            '<p data-f-id="pbf" style="text-align: center; font-size: 14px; margin-top: 30px; opacity: 0.65; font-family: sans-serif;">',
            ""
          )
          .replaceAll(
            '<a href="https://www.froala.com/wysiwyg-editor?pb=1" title="Froala Editor">',
            ""
          )
          .replaceAll("Froala Editor</a></p>", "")
      : undefined;
  return detail_success;
};

const methods = {
  // ค้นหาทั้งหมด
  async onGetAll(req, res) {
    try {
      let $where = filterData(req);
      let other = await countDataAndOrder(req, $where);
      let prismaLang = checkLanguage(req);

      const item = await prismaLang.direction.findMany({
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
      const item = await prismaLang.direction.findUnique({
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
      const item = await prisma.direction.create({
        data: {
          title_th: req.body.title_th,
          title_en: req.body.title_en,
          detail_th: cutFroala(req.body.detail_th),
          detail_en: cutFroala(req.body.detail_en),
          is_publish: Number(req.body.is_publish),
          created_contact: new Date(req.body.created_contact),
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
      const item = await prisma.direction.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          title_th: req.body.title_th != null ? req.body.title_th : undefined,
          title_en: req.body.title_en != null ? req.body.title_en : undefined,
          detail_th: cutFroala(req.body.detail_th),
          detail_en: cutFroala(req.body.detail_en),
          is_publish:
            req.body.is_publish != null
              ? Number(req.body.is_publish)
              : undefined,
          created_contact:
            req.body.created_contact != null
              ? new Date(req.body.created_contact)
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
      const item = await prisma.direction.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          deleted_at: new Date().toISOString(),
        },
      });

      res.status(200).json(item);
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };
