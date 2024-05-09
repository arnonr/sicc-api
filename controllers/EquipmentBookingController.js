const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");
const nodemailer = require("nodemailer");

const prisma = new PrismaClient();

// ค้นหา
const filterData = (req) => {
  let $where = {
    deleted_at: null,
  };

  if (req.query.id) {
    $where["id"] = parseInt(req.query.id);
  }

  if (req.query.user_id) {
    $where["user_id"] = parseInt(req.query.user_id);
  }

  if (req.query.equipment_id) {
    $where["equipment_id"] = parseInt(req.query.equipment_id);
  }

  if (req.query.firstname) {
    $where["firstname"] = {
      contains: req.query.firstname,
    };
  }

  if (req.query.surname) {
    $where["surname"] = {
      contains: req.query.surname,
    };
  }

  if (req.query.organization) {
    $where["organization"] = {
      contains: req.query.organization,
    };
  }

  if (req.query.email) {
    $where["email"] = {
      contains: req.query.email,
    };
  }

  if (req.query.tax_id) {
    $where["tax_id"] = {
      contains: req.query.tax_id,
    };
  }

  if (req.query.status_id) {
    $where["status_id"] = Number(req.query.status_id);
  }

  if (req.query.member_status) {
    $where["member_status"] = Number(req.query.member_status);
  }

  if (req.query.is_publish) {
    $where["is_publish"] = parseInt(req.query.is_publish);
  }

  if (req.query.booking_date) {
    $where["booking_date"] = {
      gte: new Date(req.query.booking_date + " 00:00:00").toISOString(),
      lte: new Date(req.query.booking_date + " 23:59:00").toISOString(),
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
  let $count = await prisma.equipment_booking.findMany({
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
  user_id: true,
  code: true,
  equipment_id: true,
  booking_date: true,
  example: true,
  prefix: true,
  firstname: true,
  surname: true,
  organization: true,
  contact_address: true,
  phone: true,
  phone2: true,
  email: true,
  invoice_address: true,
  tax_id: true,
  price: true,
  reject_comment: true,
  confirmed_date: true,
  status_id: true,
  is_publish: true,
  member_status: true,
  period_time: true,
  district_code: true,
  equipment: {
    select: {
      title_th: true,
      title_en: true,
      title: true,
    },
  },
  equipment_booking_method: true,
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
      },
    },
  });

  return prismaLang;
};

const onCheckBookingDateBeforeApprove = async (id) => {
  try {
    let checkID = undefined;

    if (id) {
      checkID = {
        id: {
          not: Number(id),
        },
      };
    }

    const item1 = await prisma.equipment_booking.findUnique({
      where: {
        id: Number(id),
      },
    });
    const item = await prisma.equipment_booking.findMany({
      where: {
        deleted_at: null,
        ...checkID,
        booking_date: {
          gte: new Date(item1.booking_date).toISOString(),
          lte: new Date(item1.booking_date).toISOString(),
        },
        status_id: 2,
      },
    });

    let check_period_time_available = [
      {
        id: 1,
        value: 1,
        name_th: "รอบเช้า (9.00- 12.00)",
        name_en: "9.00- 12.00",
        available: true,
      },
      {
        id: 2,
        value: 2,
        name_th: "รอบบ่าย (13.00- 16.00)",
        name_en: "13.00- 16.00",
        available: true,
      },
      {
        id: 3,
        value: 3,
        name_th: "เต็มวัน (9.00- 16.00)",
        name_en: "9.00- 16.00",
        available: true,
      },
    ];

    let full_period = true;
    let half_period = true;

    if (item.length != 0) {
      item.forEach((el) => {
        let cp = check_period_time_available.map((x) => {
          if (x.value == el.period_time) {
            x.available = false;
            // full_period = false;
          }
          //   if (x.id == 3) {
          //     if (x.available == false) {
          //       half_period = false;
          //     }
          //   }
          return x;
        });

        check_period_time_available = [...cp];
      });
    }

    console.log(item1);

    if (
      check_period_time_available[2].available == false ||
      check_period_time_available[item1.period_time - 1].available == false ||
      (item1.period_time == 3 &&
        check_period_time_available[0].available == false) ||
      (item1.period_time == 3 &&
        check_period_time_available[1].available == false)
    ) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    return { msg: error.message };
  }
};

const methods = {
  // ค้นหาทั้งหมด
  async onGetAll(req, res) {
    try {
      let $where = filterData(req);
      let other = await countDataAndOrder(req, $where);

      let prismaLang = checkLanguage(req);

      const item = await prismaLang.equipment_booking.findMany({
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
      const item = await prismaLang.equipment_booking.findUnique({
        select: selectField,
        where: {
          id: Number(req.params.id),
        },
      });

      //   let transporter = nodemailer.createTransport({
      //     host: "smtp.gmail.com",
      //     port: 587,
      //     secure: false,
      //     auth: {
      //       user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
      //       pass: "sicckmutnb78", // email password
      //     },
      //   });

      res.status(200).json({ data: item, msg: " success" });
    } catch (error) {
      res.status(404).json({ msg: error.message });
    }
  },

  // สร้าง
  async onCreate(req, res) {
    try {
      const item = await prisma.equipment_booking.create({
        data: {
          booking_date: new Date(req.body.booking_date),
          period_time: Number(req.body.period_time),
          equipment_id: Number(req.body.equipment_id),
          user_id: Number(req.body.user_id),
          member_status: Number(req.body.member_status),
          example: req.body.example,
          prefix: req.body.prefix,
          firstname: req.body.firstname,
          surname: req.body.surname,
          organization: req.body.organization,
          contact_address: req.body.contact_address,
          phone: req.body.phone,
          email: req.body.email,
          invoice_address: req.body.invoice_address,
          tax_id: req.body.tax_id,
          price: req.body.price,
          district_code: Number(req.body.district_code),
          phone2: req.body.phone2,
          //   reject_comment: req.body.reject_comment,
          //   confirmed_date: req.body.confirmed_date,
          status_id: Number(req.body.status_id),
          is_publish: Number(req.body.is_publish),
          created_by: "arnonr",
          updated_by: "arnonr",
        },
      });

      //   equipment_method
      for (let i = 0; i < req.body.equipment_booking_method.length; i++) {
        let data_method = {
          equipment_booking_id: Number(item.id),
          equipment_method_id: Number(
            req.body.equipment_booking_method[i].equipment_method_id
          ),
          quantity: Number(req.body.equipment_booking_method[i].quantity),
          price: Number(req.body.equipment_booking_method[i].total_price),
          created_by: "arnonr",
          updated_by: "arnonr",
        };

        await prisma.equipment_booking_method.create({
          data: data_method,
        });
      }

      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
          pass: "sicckmutnb78", // email password
        },
      });

      //   email
      let item_user = await prisma.user.findMany({
        where: {
          group_id: { in: [1, 3] },
          is_active: 1,
        },
      });

      let email1 = [];
      let email2 = [];
      for (let itu of item_user) {
        if (itu.group_id == 1) {
          email1.push(itu.email);
        }

        if (itu.group_id == 3) {
          email2.push(itu.email);
        }
      }

      await transporter.sendMail({
        from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
        to: item.email, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
        subject:
          "รายการเช็คค่าบริการ และประมาณค่าใช้จ่ายผ่านระบบอัตโนมัติจากศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สสมรรถนะสูง", // หัวข้ออีเมล
        html: `<div
         style="
           font-family: Roboto, RobotoDraft, Helvetica, Arial,
             sans-serif;
           border-style: solid;
           border-width: thin;
           border-color: #dadce0;
           border-radius: 8px;
           padding: 40px 20px;
         "
       >
         <div style="margin-bottom: 22px">
           <img
             src="http://sci.kmutnb.ac.th/sicc/_nuxt/logo-sicc.5cf857a5.png"
             alt=""
             style="width: 160px"
             class="CToWUd"
             data-bit="iit"
           />
         </div>
         <div style="font-size: 20px; margin-bottom: 22px; max-width: 800px">
           ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูงขอขอบพระคุณเป็นอย่างสูง
           ที่ท่านให้ความไว้วางใจในการเช็คค่าบริการ
           และประมาณค่าใช้จ่ายผ่านระบบอัตโนมัติของเรา
           ขณะนี้เราได้รับรายการเช็คค่าบริการและประมาณค่าใช้จ่ายผ่านระบบอัตโนมัติจากท่านเรียบร้อยแล้ว
         </div>
         <div style="font-size: 20px; margin-bottom: 22px">
           ถ้าท่านมีความสนใจต้องการเข้ารับบริการ/จองคิว กรุณาติดต่อ
         </div>
         <div style="font-size: 20px; margin-bottom: 22px">
           Tel : +66 2555 2000 Ext.4257
         </div>
         <div style="font-size: 20px; margin-bottom: 22px">
           Email : sicc@sci.kmutnb.ac.th
         </div>
         <div style="font-size: 20px; margin-bottom: 22px">
           Website : <a href="http://sci.kmutnb.ac.th/sicc/">sicc.sci.kmutnb.ac.th</a>
         </div>
         <div style="border-top: 1px solid #dadce0; margin: 20px 0 10px 0"></div>
       </div>`,
      });

      // if (email1.length > 0) {
      //   await transporter.sendMail({
      //     from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
      //     to: email1, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
      //     subject: "พบรายการจองใหม่ กรุณาตรวจสอบเพื่อทำการอนุมัติ", // หัวข้ออีเมล
      //     html:
      //       "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดพิจารณาการจอง : <a href='" +
      //       process.env.PATH_CLIENT +
      //       "admin/booking" +
      //       "'>คลิก</a>", // html body
      //   });
      // }

      // if (email2.length > 0) {
      //   await transporter.sendMail({
      //     from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
      //     to: email2, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
      //     subject: "พบรายการจองใหม่ กรุณาตรวจสอบเพื่อทำการอนุมัติ", // หัวข้ออีเมล
      //     html:
      //       "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดพิจารณาการจอง : <a href='" +
      //       process.env.PATH_CLIENT +
      //       "admin/booking" +
      //       "'>คลิก</a>", // html body
      //   });
      // }

      res.status(201).json({ ...item, msg: "success" });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  // แก้ไข
  async onUpdate(req, res) {
    try {
      const item = await prisma.equipment_booking.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          booking_date:
            req.body.booking_date != null
              ? new Date(req.body.booking_date)
              : undefined,
          period_time:
            req.body.period_time != null
              ? Number(req.body.period_time)
              : undefined,
          equipment_id:
            req.body.equipment_id != null
              ? Number(req.body.equipment_id)
              : undefined,
          user_id:
            req.body.user_id != null ? Number(req.body.user_id) : undefined,
          member_status:
            req.body.member_status != null
              ? Number(req.body.member_status)
              : undefined,
          example: req.body.example != null ? req.body.example : undefined,
          prefix: req.body.prefix != null ? req.body.prefix : undefined,
          firstname:
            req.body.firstname != null ? req.body.firstname : undefined,
          surname: req.body.surname != null ? req.body.surname : undefined,
          organization:
            req.body.organization != null ? req.body.organization : undefined,
          contact_address:
            req.body.contact_address != null
              ? req.body.contact_address
              : undefined,
          phone: req.body.phone != null ? req.body.phone : undefined,
          email: req.body.email != null ? req.body.email : undefined,
          district_code: Number(req.body.district_code),
          phone2: req.body.phone2,
          invoice_address:
            req.body.invoice_address != null
              ? req.body.invoice_address
              : undefined,
          tax_id: req.body.tax_id != null ? req.body.tax_id : undefined,
          price: req.body.price != null ? req.body.price : undefined,
          status_id:
            req.body.status_id != null ? Number(req.body.status_id) : undefined,
          is_publish:
            req.body.is_publish != null
              ? Number(req.body.is_publish)
              : undefined,
          reject_comment:
            req.body.reject_comment != null
              ? req.body.reject_comment
              : undefined,
          confirmed_date:
            req.body.confirmed_date != null
              ? new Date(req.body.confirmed_date)
              : undefined,
          updated_by: "arnonr",
        },
      });

      //   equipment_method
      if (req.body.equipment_booking_method) {
        for (let i = 0; i < req.body.equipment_booking_method.length; i++) {
          let data_method = {
            quantity: Number(req.body.equipment_booking_method[i].quantity),
            price: Number(req.body.equipment_booking_method[i].total_price),
            updated_by: "arnonr",
          };

          await prisma.equipment_booking_method.update({
            where: {
              id: Number(req.body.equipment_booking_method[i].id),
            },
            data: data_method,
          });
        }
      }

      //   email
      //   let item_user = await prisma.user.findMany({
      //     where: {
      //       group_id: { in: [1, 3] },
      //       is_active: 1,
      //     },
      //   });

      //   let email1 = [];
      //   let email2 = [];
      //   for (let itu of item_user) {
      //     if (itu.group_id == 1) {
      //       email1.push(itu.email);
      //     }

      //     if (itu.group_id == 3) {
      //       email2.push(itu.email);
      //     }
      //   }

      //   if (email1.length > 0) {
      //     await transporter.sendMail({
      //       from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
      //       to: itu.email1, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
      //       subject: "พบรายการจองใหม่ กรุณาตรวจสอบเพื่อทำการอนุมัติ", // หัวข้ออีเมล
      //       html:
      //         "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดพิจารณาการจอง : <a href='" +
      //         process.env.PATH_CLIENT +
      //         "admin/booking" +
      //         "'>คลิก</a>", // html body
      //     });
      //   }

      //   if (email2.length > 0) {
      //     await transporter.sendMail({
      //       from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
      //       to: itu.email2, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
      //       subject: "พบรายการจองใหม่ กรุณาตรวจสอบเพื่อทำการอนุมัติ", // หัวข้ออีเมล
      //       html:
      //         "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดพิจารณาการจอง : <a href='" +
      //         process.env.PATH_CLIENT +
      //         "admin/booking" +
      //         "'>คลิก</a>", // html body
      //     });
      //   }

      res.status(200).json({ ...item, msg: "success" });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
  // ลบ
  async onDelete(req, res) {
    try {
      const item = await prisma.equipment_booking.update({
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

  //   อนุมัติ
  async onApprove(req, res) {
    try {
      let check = true;
      if (req.body.status_id == 2) {
        check = await onCheckBookingDateBeforeApprove(req.params.id);
      }

      if (check == false) {
        throw new Error("Booking Duplicate");
      }

      const item = await prisma.equipment_booking.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          confirmed_date:
            req.body.confirmed_date != null
              ? new Date(req.body.confirmed_date)
              : undefined,
          status_id:
            req.body.status_id != null ? Number(req.body.status_id) : undefined,
          reject_comment:
            req.body.reject_comment != null
              ? req.body.reject_comment
              : undefined,
          updated_by: "arnonr",
        },
      });

      if (item.status_id == 2 || item.status_id == 3) {
        let transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
            pass: "sicckmutnb78", // email password
          },
        });
        let text = {};
        if (item.status_id == 2) {
          text["subject"] = "การจองของท่านได้รับการอนุมัติ";
        } else {
          text["subject"] = "การจองของท่านได้รับการปฏิเสธ";
        }

        await transporter.sendMail({
          from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
          to: item.email, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
          subject: text.subject, // หัวข้ออีเมล
          html:
            "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> ดูรายละเอียดได้ที่ : <a href='" +
            process.env.PATH_CLIENT +
            "booking" +
            "'>คลิก</a>", // html body
        });
      }

      res.status(200).json({ ...item, msg: "success" });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  async onCheckBookingDate(req, res) {
    try {
      let checkID = undefined;
      if (req.query.not_id) {
        checkID = {
          id: {
            not: Number(req.query.not_id),
          },
        };
      }
      const item = await prisma.equipment_booking.findMany({
        where: {
          deleted_at: null,
          ...checkID,
          booking_date: {
            gte: new Date(req.query.booking_date + " 00:00:00").toISOString(),
            lte: new Date(req.query.booking_date + " 23:59:00").toISOString(),
          },
          status_id: 2,
        },
      });

      let check_period_time_available = [
        {
          id: 1,
          value: 1,
          name_th: "รอบเช้า (9.00- 12.00)",
          name_en: "9.00- 12.00",
          available: true,
        },
        {
          id: 2,
          value: 2,
          name_th: "รอบบ่าย (13.00- 16.00)",
          name_en: "13.00- 16.00",
          available: true,
        },
        {
          id: 3,
          value: 3,
          name_th: "เต็มวัน (9.00- 16.00)",
          name_en: "9.00- 16.00",
          available: true,
        },
      ];

      let full_period = true;
      let half_period = true;
      if (item.length != 0) {
        item.forEach((el) => {
          let cp = check_period_time_available.map((x) => {
            if (x.value == el.period_time) {
              x.available = false;
              full_period = false;
            }
            if (x.id == 3) {
              if (x.available == false) {
                half_period = false;
              }
            }
            return x;
          });

          check_period_time_available = [...cp];
        });
      }

      check_period_time_available[2].available = full_period;
      if (half_period == false) {
        check_period_time_available[0].available = false;
        check_period_time_available[1].available = false;
      }

      res.status(200).json({
        period_available: check_period_time_available,
        msg: "success",
      });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };

/* <div>
<table
  style="
    width: 1000px;
    font-family: Roboto, RobotoDraft, Helvetica, Arial,
      sans-serif;
    border-style: solid;
    border-width: thin;
    border-color: #dadce0;
    border-radius: 8px;
    padding: 40px;
    margin: auto;
  "
>
  <tr>
    <td colspan="2" style="text-align: right;padding-bottom: 1em;">
      <span> เลขที่รายการสั่งซื้อ SICC-BO-${item.id} </span>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="text-align: right;padding-bottom: 2em;">
        <span> วันที่ ${item.date} </span>
    </td>
  </tr>

  <tr>
    <td colspan="2" style="text-align: center">
      <h3 style="padding-bottom: 1em">รายการสั่งซื้อสินค้า</h3></span>
    </td>
  </tr>

  <tr>
    <td>
        <table style="width: 500px; margin-right: 1em;">
            <tr>
              <td
                colspan="2"
                style="
                  font-weight: bold;
                  text-align: center;
                  background-color: #ffcb05;
                  border-radius: 0.5em;
                  padding: 0.4em;
                "
              >
                ชื่อผู้สั่ง/จัดส่งสินค้า
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold;padding-top: 1em;">ชื่อ นามสกุล :</td>
              <td style="font-style: italic;padding-top: 1em;">${
                item.firstname + " " + item.surname
              }</td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
              <td style="font-weight: bold;">บริษัท :</td>
              <td style="font-style: italic;">
              ${item.organization}
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>

            <tr>
              <td style="font-weight: bold;">ที่อยู่ :</td>
              <td style="font-style: italic;">
              ${item.contact_address}
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
              <td style="font-weight: bold;">จังหวัด :</td>
              <td style="font-style: italic;">
              ${item.contact_address}
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
              <td style="font-weight: bold;">รหัสไปรษณีย์ :</td>
              <td style="font-style: italic;">
              ${item.contact_address}
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
              <td style="font-weight: bold;">โทรศัพท์ :</td>
              <td style="font-style: italic;">
              ${item.phone}
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
              <td style="font-weight: bold;">โทรสาร :</td>
              <td style="font-style: italic;">
                02-555-2020
              </td>
            </tr>
            <tr>
                <td colspan="2">
                <hr style="border-color: #eee;border-style: dotted;" />
                    </td>
            </tr>
            <tr>
                <td style="font-weight: bold;">อีเมล :</td>
                <td style="font-style: italic;">
                  arnon.r@tgde.kmutnb.ac.th
                </td>
              </tr>

          </table>
    </td>
    <td style="border-left: 1px solid;">
      <table style="width: 500px; margin-left: 1em;">
        <tr>
          <td
            colspan="2"
            style="
              font-weight: bold;
              text-align: center;
              background-color: #ffcb05;
              border-radius: 0.5em;
              padding: 0.4em;
            "
          >
            ชื่อออกใบกำกับภาษี
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold;padding-top: 1em;">ชื่อ นามสกุล :</td>
          <td style="font-style: italic;padding-top: 1em;">อานนท์ รักจักร์</td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">บริษัท :</td>
          <td style="font-style: italic;" >
            มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>

        <tr>
          <td style="font-weight: bold;">ที่อยู่ :</td>
          <td style="font-style: italic;">
            705 ซ.จรัญสนิทวงศ์ 89 แขวงบางอ้อ เขตบางพลัด
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">จังหวัด :</td>
          <td style="font-style: italic;">
            กรุงเทพมหานคร
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">รหัสไปรษณีย์ :</td>
          <td style="font-style: italic;">
            10700
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">โทรศัพท์ :</td>
          <td style="font-style: italic;">
            02-555-2000
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
          <td style="font-weight: bold;">โทรสาร :</td>
          <td style="font-style: italic;">
            02-555-2020
          </td>
        </tr>
        <tr>
            <td colspan="2">
            <hr style="border-color: #eee;border-style: dotted;" />
                </td>
        </tr>
        <tr>
            <td style="font-weight: bold;">อีเมล :</td>
            <td style="font-style: italic;">
              arnon.r@tgde.kmutnb.ac.th
            </td>
          </tr>

      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="text-align: left;padding-top: 2em;">

      <hr>
        <div style="margin-top: 1em;"><span  style="font-weight: bold;">เครื่องมือ/Scientific Instrument : </span><span style="font-weight: bold;color:#ffcb05;font-style: italic;">นิวเคลียร์แมกเนติกเรโซแนนซ์สเปกโตรมิเตอร์ </span></div>
        <div style="margin-top: 1em;"><span  style="font-weight: bold;">วันที่จอง/Booking Date : </span><span style="font-weight: bold;color:#ffcb05;font-style: italic;">16 มี.ค. 2567 </span></div>
        <div style="margin-top: 1em;"><span  style="font-weight: bold;">ข้อมูลตัวอย่าง/Example : </span><span style="font-weight: bold;color:#ffcb05;font-style: italic;">TEST </span></div>
        </td>
        </tr>

  <tr>
    <td colspan="2" style="text-align: center;padding-top: 2em;">
      <table style="width:100%;border-style:solid;border-width:1px; border-collapse: collapse">
        <tr>
          <th style="text-align: center;border-style:solid;border-width:1px;background-color: #ffcb05;padding:0.4em">ลําดับ</th>
          <th style="text-align: center;border-style:solid;border-width:1px;background-color: #ffcb05;padding:0.4em">รายการวิเคราะห์</th>
          <th style="text-align: center;border-style:solid;border-width:1px;background-color: #ffcb05;padding:0.4em">จำนวน</th>
          <th style="text-align: center;border-style:solid;border-width:1px;background-color: #ffcb05;padding:0.4em">ราคา</th>
        </tr>
        <tr>
          <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">1</td>
          <td style="border-style:solid;border-width:1px;padding:0.4em;">Scanning Electron Microscope SEM</td>
          <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">1 ชั่วโมง</td>
          <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">450.00</td>
        </tr>
        <tr>
            <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">2</td>
            <td style="border-style:solid;border-width:1px;padding:0.4em;">Scanning Electron Microscope SEM</td>
            <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">1 ชั่วโมง</td>
            <td style="border-style:solid;border-width:1px;text-align: center;padding:0.4em;">450.00</td>
          </tr>

          <tr>
            <td colspan="3" style="border-style:solid;border-width:1px;text-align: right;padding:0.4em;font-weight: bold;">รวม</td>
            <td style="border-style:solid;border-width:1px;padding:0.4em;text-align: center;">900.00</td>
          </tr>

      </table>
    </td>
  </tr>
</table>
</div> */
