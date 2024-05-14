const express = require("express");
// import api from './api/index.js' 
const user = require("./api/user");
const profile = require("./api/profile");
const news = require("./api/news");
const newsType = require("./api/news-type");
const annouce = require("./api/annouce");
const banner = require("./api/banner");
const video = require("./api/video");
const about = require("./api/about");
const contact = require("./api/contact");
const direction = require("./api/direction");
const department = require("./api/department");
const team = require("./api/team");
const froala = require("./api/froala");
const newsGallery = require("./api/news-gallery");
const sdg = require("./api/sdg");
const sdgType = require("./api/sdg-type");
const equipmentDepartment = require("./api/equipment-department");
const equipmentGallery = require("./api/equipment-gallery");
const equipment = require("./api/equipment");
const equipmentMethod = require("./api/equipment-method");
const booking = require("./api/booking");
const report = require("./api/report");

const router = express.Router();

router.use(
  `/sicc-api/api/v${process.env.API_VERSION}`,
  router.use("/user", user),
  router.use("/profile", profile),
  router.use("/news", news),
  router.use("/news-type", newsType),
  router.use("/annouce", annouce),
  router.use("/banner", banner),
  router.use("/video", video),
  router.use("/about", about),
  router.use("/contact", contact),
  router.use("/direction", direction),
  router.use("/department", department),
  router.use("/team", team),
  router.use("/froala", froala),
  router.use("/news-gallery", newsGallery),
  router.use("/sdg", sdg),
  router.use("/sdg-type", sdgType),
  router.use("/equipment-department",equipmentDepartment),
  router.use("/equipment-gallery", equipmentGallery),
  router.use("/equipment", equipment),
  router.use("/equipment-method", equipmentMethod),
  router.use("/booking", booking),
  router.use("/report", report),
);

module.exports = router;
