const express = require("express");
const router = express.Router()

const controllers = require("../../controllers/ReportController");

router.get(
  "/",
  controllers.onGetAll
);

router.delete(
  "/:id",
  controllers.onDelete
);

module.exports = router;