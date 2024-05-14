const uploadController = require("./UploadsController");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const methods = {
  // สร้าง
  async onUploadImage(req, res) {
    try {
      let pathFile = await uploadController.onUploadFile(
        req,
        "/froala/images/",
        "file"
      );

      if (pathFile == "error") {
        res.status(500).send("error");
      } else {
        res.status(201).json({ link: process.env.PATH_UPLOAD + pathFile });
      }
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  async onUploadDocument(req, res) {
    try {
      let pathFile = await uploadController.onUploadFile(
        req,
        "/froala/documents/",
        "file"
      );

      if (pathFile == "error") {
        res.status(500).send("error");
      } else {
        res.status(201).json({ link: process.env.PATH_UPLOAD + pathFile });
      }
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  async onUploadVideo(req, res) {
    try {
      let pathFile = await uploadController.onUploadFile(
        req,
        "/froala/videos/",
        "file"
      );

      if (pathFile == "error") {
        res.status(500).send("error");
      } else {
        res.status(201).json({ link: process.env.PATH_UPLOAD + pathFile });
      }
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  async onUploadUppy(req, res) {
    try {
      let table_name = req.body.table_name;

      let pathFile = await uploadController.onUploadFile(
        req,
        "/uppy/" + table_name + "/",
        "file"
      );

      if (pathFile == "error") {
        res.status(500).send("error");
      } else {
        let data = {};
        data[table_name + "_id"] =
          req.body[table_name + "_id"] != "null"
            ? Number(req.body[table_name + "_id"])
            : null;
        data[table_name + "_gallery_file"] = pathFile;
        data["secret_key"] = req.body.secret_key;
        data["is_publish"] = 1;
        data["created_by"] = "arnonr";
        data["updated_by"] = "arnonr";

        const item = await prisma[table_name + "_gallery"].create({
          data: data,
        });

        let return_json = {};
        return_json["message"] = "success";
        return_json["link"] = pathFile;
        return_json[table_name + "_id"] = item[table_name + "_id"];
        return_json[table_name + "_gallery_id"] = item.id;
        res.status(201).json(return_json);
      }
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  async onUploadReportUppy(req, res) {
    try {
      let table_name = req.body.table_name;

      let pathFile = await uploadController.onUploadFile(
        req,
        "/uppy/report/",
        "file"
      );

      if (pathFile == "error") {
        res.status(500).send("error");
      } else {
        let data = {};
        data[table_name + "_id"] =
          req.body[table_name + "_id"] != "null"
            ? Number(req.body[table_name + "_id"])
            : null;
        data["report_file"] = pathFile;
        data["secret_key"] = req.body.secret_key;
        data["is_publish"] = 1;
        data["created_by"] = "arnonr";
        data["updated_by"] = "arnonr";

        const item = await prisma["report"].create({
          data: data,
        });

        let return_json = {};
        return_json["message"] = "success";
        return_json["link"] = pathFile;
        return_json[table_name + "_id"] = item[table_name + "_id"];
        return_json["id"] = item.id;
        res.status(201).json(return_json);
      }
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };
