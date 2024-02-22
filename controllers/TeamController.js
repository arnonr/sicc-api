const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");

const prisma = new PrismaClient().$extends({
  result: {
    team: {
      team_file: {
        needs: { team_file: true },
        compute(team) {
          let file = null;
          if (team.team_file != null) {
            file = process.env.PATH_UPLOAD + team.team_file;
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
    $where["firstname_en"] = {
      not: null,
      not: "",
    };
  }

  if (req.query.prefix_th) {
    $where["prefix_th"] = {
      contains: req.query.prefix_th,
    };
  }

  if (req.query.prefix_en) {
    $where["prefix_en"] = {
      contains: req.query.prefix_en,
    };
  }

  if (req.query.firstname_th) {
    $where["firstname_th"] = {
      contains: req.query.firstname_th,
    };
  }

  if (req.query.firstname_en) {
    $where["firstname_en"] = {
      contains: req.query.firstname_en,
    };
  }

  if (req.query.surname_th) {
    $where["surname_th"] = {
      contains: req.query.surname_th,
    };
  }

  if (req.query.surname_en) {
    $where["surname_en"] = {
      contains: req.query.surname_en,
    };
  }

  if (req.query.department_id) {
    $where["department_id"] = parseInt(req.query.department_id);
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
    $orderBy = { level: "asc" };
  }

  //Count
  let $count = await prisma.team.findMany({
    where: $where,
  });

  $count = $count.length;
  let $perPage = req.query.perPage ? Number(req.query.perPage) : 50;
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
  prefix_th: true,
  prefix_en: true,
  firstname_th: true,
  firstname_en: true,
  surname_th: true,
  surname_en: true,
  position_th: true,
  position_en: true,
  position_level_th: true,
  position_level_en: true,
  phone: true,
  email: true,
  level: true,
  department_id: true,
  team_file: true,
  is_publish: true,
  department: {
    select: {
      name_th: true,
      name_en: true,
      name: true,
    },
  },
  prefix: true,
  firstname: true,
  surname: true,
  position: true,
  position_level: true,
};

// ปรับ Language
const checkLanguage = (req) => {
  let prismaLang = prisma.$extends({
    result: {
      team: {
        prefix: {
          needs: { prefix_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.prefix_en
              : table.prefix_th;
          },
        },
        firstname: {
          needs: { firstname_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.firstname_en
              : table.firstname_th;
          },
        },
        surname: {
          needs: { surname_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.surname_en
              : table.surname_th;
          },
        },
        position: {
          needs: { position_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.position_en
              : table.position_th;
          },
        },
        position_level: {
          needs: { position_level_th: true },
          compute(table) {
            return req.query.lang && req.query.lang == "en"
              ? table.position_level_en
              : table.position_level_th;
          },
        },
      },
      department: {
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
  // ค้นหาทั้งหมด
  async onGetAll(req, res) {
    try {
      let $where = filterData(req);
      let other = await countDataAndOrder(req, $where);

      let prismaLang = checkLanguage(req);

      const item = await prismaLang.team.findMany({
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

      const item = await prismaLang.team.findUnique({
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
        "/images/team/",
        "team_file"
      );

      if (pathFile == "error") {
        return res.status(500).send("error");
      }

      const checkLevel = await prisma.team.findFirst({
        where: { department_id: Number(req.body.department_id) },
        orderBy: {
          level: "desc",
        },
      });

      let level = 1;
      if (checkLevel) {
        level = checkLevel.level + 1;
      }

      const item = await prisma.team.create({
        data: {
          department_id: Number(req.body.department_id),
          prefix_th: req.body.prefix_th,
          prefix_en: req.body.prefix_en,
          firstname_th: req.body.firstname_th,
          firstname_en: req.body.firstname_en,
          surname_th: req.body.surname_th,
          surname_en: req.body.surname_en,
          email: req.body.email,
          phone: req.body.phone,
          level: level,
          team_file: pathFile,
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
      let pathFile = await uploadController.onUploadFile(
        req,
        "/images/team/",
        "team_file"
      );

      if (pathFile == "error") {
        return res.status(500).send("error");
      }

      const item = await prisma.team.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          department_id:
            req.body.department_id != null
              ? Number(req.body.department_id)
              : undefined,
          prefix_th:
            req.body.prefix_th != null ? req.body.prefix_th : undefined,
          prefix_en:
            req.body.prefix_en != null ? req.body.prefix_en : undefined,
          firstname_th:
            req.body.firstname_th != null ? req.body.firstname_th : undefined,
          firstname_en:
            req.body.firstname_en != null ? req.body.firstname_en : undefined,
          surname_th:
            req.body.surname_th != null ? req.body.surname_th : undefined,
          surname_en:
            req.body.surname_en != null ? req.body.surname_en : undefined,

          email: req.body.email != null ? req.body.email : undefined,
          phone: req.body.phone != null ? req.body.phone : undefined,
          team_file: pathFile != null ? pathFile : undefined,
          is_publish:
            req.body.is_publish != null
              ? Number(req.body.is_publish)
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
      await prisma.team.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          level: null,
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

  //   ChangeLevel
  async onChangeLevel(req, res) {
    try {
      const item = await prisma.team.findUnique({
        where: {
          id: Number(req.params.id),
        },
      });

      let item1 = null;

      if (req.body.type == "up") {
        item1 = await prisma.team.findFirst({
          where: {
            level: item.level - 1,
            department_id: item.department_id,
          },
        });
      }

      if (req.body.type == "down") {
        item1 = await prisma.team.findFirst({
          where: {
            level: item.level + 1,
            department_id: item.department_id,
          },
        });
      }

      if (item1 != null) {
        let level = item1.level;
        let level1 = item.level;

        item.level = level;

        await prisma.team.update({
          where: {
            id: Number(req.params.id),
          },
          data: {
            level: level,
            updated_by: "arnonr",
          },
        });

        await prisma.team.update({
          where: {
            id: item1.id,
          },
          data: {
            level: level1,
            updated_by: "arnonr",
          },
        });
      }

      res.status(200).json({ msg: "success" });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };
