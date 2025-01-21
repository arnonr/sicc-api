const express = require("express");
const router = express.Router();

const controllers = require("../../controllers/NewsController");
const auth = require("../auth");
// const { checkPermission } = require("../accessControl");

router.get("/", controllers.onGetAll);
router.get("/:id", controllers.onGetById);

router.post(
    "/:id",
    // auth.required,
    controllers.onUpdate
);

router.post(
    "/",
    // auth.required,
    controllers.onCreate
);

router.delete(
    "/:id",
    //   auth.required,
    controllers.onDelete
);

module.exports = router;
