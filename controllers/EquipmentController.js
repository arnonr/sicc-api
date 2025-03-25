const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");

const prisma = new PrismaClient().$extends({
  result: {
    equipment: {
      equipment_file: {
        needs: { equipment_file: true },
        compute(table) {
          let file = null;
          if (table.equipment_file != null) {
            file = process.env.PATH_UPLOAD + table.equipment_file;
          }
          return file;
        },
      },
      rate_file: {
        needs: { rate_file: true },
        compute(table) {
          let file = null;
          if (table.rate_file != null) {
            file = process.env.PATH_UPLOAD + table.rate_file;
          }
          return file;
        },
      },
    },
  },
});

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

  if (req.query.equipment_department_id) {
    $where["equipment_department_id"] = parseInt(
      req.query.equipment_department_id
    );
  } else {
    if (req.query.not_equipment_department_id) {
      $where["equipment_department_id"] = {
        gt: parseInt(req.query.not_equipment_department_id),
      };
    }
  }

  if (req.query.is_publish) {
    $where["is_publish"] = parseInt(req.query.is_publish);
  }

  if (req.query.created_year) {
    $where["created_equipment"] = {
      gte: new Date(req.query.created_year + "-01-01 00:00:00").toISOString(),
      lte: new Date(req.query.created_year + "-12-31 23:59:00").toISOString(),
    };
  }

  if (req.query.created_month) {
    $where["created_equipment"] = {
      gte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-01 00:00:00"
      ).toISOString(),
      lte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-31 23:59:00"
      ).toISOString(),
    };
  }

  if (req.query.created_equipment) {
    $where["created_equipment"] = {
      gte: new Date(req.query.created_equipment + " 00:00:00").toISOString(),
      lte: new Date(req.query.created_equipment + " 23:59:00").toISOString(),
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
    $orderBy = { created_at: "desc" };
  }

  //Count
  let $count = await prisma.equipment.findMany({
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
  equipment_department_id: true,
  detail_th: true,
  detail_en: true,
  equipment_file: true,
  rate_file: true,
  is_publish: true,
  count_views: true,
  created_equipment: true,
  title: true,
  detail: true,
  equipment_department: {
    select: {
      name_th: true,
      name_en: true,
      name: true,
      name_short: true,
      contact_us_th: true,
      contact_us_en: true,
    },
  },
};

// ปรับ Language
const checkLanguage = (req) => {
  let prismaLang = prisma.$extends({
    result: {
      equipment: {
        title: {
          needs: { title_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.title_en
              : table.title_th;
          },
        },
        detail: {
          needs: { detail_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.detail_en
              : table.detail_th;
          },
        },
      },
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

      const item = await prismaLang.equipment.findMany({
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
      const item = await prismaLang.equipment.findUnique({
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
      let pathFile = await uploadController.onUploadFile(
        req,
        "/images/equipment/",
        "equipment_file"
      );

      if (pathFile == "error") {
        return res.status(500).send("error");
      }

      let pathRateFile = await uploadController.onUploadFile(
        req,
        "/images/equipment/rate/",
        "rate_file"
      );

      const item = await prisma.equipment.create({
        data: {
          equipment_department_id: Number(req.body.equipment_department_id),
          equipment_category_id: 1,
          title_th: req.body.title_th,
          title_en: req.body.title_en,
          detail_th: cutFroala(req.body.detail_th),
          detail_en: cutFroala(req.body.detail_en),
          equipment_file: pathFile,
          rate_file: pathRateFile,
          is_publish: Number(req.body.is_publish),
          created_equipment: new Date(req.body.created_equipment),
          created_by: "arnonr",
          updated_by: "arnonr",
        },
      });

      //   const updateGallery =
      await prisma.equipment_gallery.updateMany({
        where: {
          secret_key: req.body.secret_key,
        },
        data: {
          equipment_id: item.id,
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
      let pathFile = null;
      if (req.body.equipment_file != "undefined") {
        pathFile = await uploadController.onUploadFile(
          req,
          "/images/equipment/",
          "equipment_file"
        );

        if (pathFile == "error") {
          return res.status(500).send("error");
        }
      }

      let pathRateFile = null;
      if (req.body.rate_file != "undefined") {
        pathRateFile = await uploadController.onUploadFile(
          req,
          "/images/equipment/rate/",
          "rate_file"
        );

        if (pathRateFile == "error") {
          return res.status(500).send("error");
        }
      }

      const item = await prisma.equipment.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          title_th: req.body.title_th != null ? req.body.title_th : undefined,
          title_en: req.body.title_en != null ? req.body.title_en : undefined,
          equipment_department_id:
            req.body.equipment_department_id != null
              ? Number(req.body.equipment_department_id)
              : undefined,
          detail_th: cutFroala(req.body.detail_th),
          detail_en: cutFroala(req.body.detail_en),
          equipment_file: pathFile != null ? pathFile : undefined,
          rate_file: pathRateFile != null ? pathRateFile : undefined,
          is_publish:
            req.body.is_publish != null
              ? Number(req.body.is_publish)
              : undefined,
          created_equipment:
            req.body.created_equipment != null
              ? new Date(req.body.created_equipment)
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
      const item = await prisma.equipment.update({
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
