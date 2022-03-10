const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const validator = require('email-validator');
const fs = require('file-system');
const csv = require('csvtojson');
const path = require('path');
const { signToken } = require('../utils/jwt');
const Model = require('../models/adminUsers.model');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

const getInvitationEmail = ({ token, adminName }) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if (gte mso 9)|(IE)]>
  <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"> <!-- So that mobile will display zoomed in -->
<meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- enable media queries for windows phone 8 -->
<meta name="format-detection" content="telephone=no"> <!-- disable auto telephone linking in iOS -->
<meta name="format-detection" content="date=no"> <!-- disable auto date linking in iOS -->
<meta name="format-detection" content="address=no"> <!-- disable auto address linking in iOS -->
<meta name="format-detection" content="email=no"> <!-- disable auto email linking in iOS -->
<meta name="color-scheme" content="only">
<title></title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@100;200;300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

<style type="text/css">
/*Basics*/
body {margin:0px !important; padding:0px !important; display:block !important; min-width:100% !important; width:100% !important; -webkit-text-size-adjust:none;}
table {border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt;}
table td {border-collapse: collapse;mso-line-height-rule:exactly;}
td img {-ms-interpolation-mode:bicubic; width:auto; max-width:auto; height:auto; margin:auto; display:block!important; border:0px;}
td p {margin:0; padding:0;}
td div {margin:0; padding:0;}
td a {text-decoration:none; color: inherit;}
/*Outlook*/
.ExternalClass {width: 100%;}
.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div {line-height:inherit;}
.ReadMsgBody {width:100%; background-color: #ffffff;}
/* iOS BLUE LINKS */
a[x-apple-data-detectors] {color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important;} 
/*Gmail blue links*/
u + #body a {color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit;}
/*Buttons fix*/
.undoreset a, .undoreset a:hover {text-decoration:none !important;}
.yshortcuts a {border-bottom:none !important;}
.ios-footer a {color:#aaaaaa !important;text-decoration:none;}
/* data-outer-table="800 - 600" */
.outer-table {width:640px!important;max-width:640px!important;}
/* data-inner-table="780 - 540" */
.inner-table {width:580px!important;max-width:580px!important;}
/*Responsive-Tablet*/
@media only screen and (max-width: 799px) and (min-width: 601px) {
  .outer-table.row {width:640px!important;max-width:640px!important;}
  .inner-table.row {width:580px!important;max-width:580px!important;}
}
/*Responsive-Mobile*/
@media only screen and (max-width: 600px) and (min-width: 320px) {
  table.row {width: 100%!important;max-width: 100%!important;}
  td.row {width: 100%!important;max-width: 100%!important;}
  .img-responsive img {width:100%!important;max-width: 100%!important;height: auto!important;margin: auto;}
  .center-float {float: none!important;margin:auto!important;}
  .center-text{text-align: center!important;}
  .container-padding {width: 100%!important;padding-left: 15px!important;padding-right: 15px!important;}
  .container-padding10 {width: 100%!important;padding-left: 10px!important;padding-right: 10px!important;}
  .hide-mobile {display: none!important;}
  .menu-container {text-align: center !important;}
  .autoheight {height: auto!important;}
  .m-padding-10 {margin: 10px 0!important;}
  .m-padding-15 {margin: 15px 0!important;}
  .m-padding-20 {margin: 20px 0!important;}
  .m-padding-30 {margin: 30px 0!important;}
  .m-padding-40 {margin: 40px 0!important;}
  .m-padding-50 {margin: 50px 0!important;}
  .m-padding-60 {margin: 60px 0!important;}
  .m-padding-top10 {margin: 30px 0 0 0!important;}
  .m-padding-top15 {margin: 15px 0 0 0!important;}
  .m-padding-top20 {margin: 20px 0 0 0!important;}
  .m-padding-top30 {margin: 30px 0 0 0!important;}
  .m-padding-top40 {margin: 40px 0 0 0!important;}
  .m-padding-top50 {margin: 50px 0 0 0!important;}
  .m-padding-top60 {margin: 60px 0 0 0!important;}
  .m-height10 {font-size:10px!important;line-height:10px!important;height:10px!important;}
  .m-height15 {font-size:15px!important;line-height:15px!important;height:15px!important;}
  .m-height20 {font-size:20px!important;line-height:20px!important;height:20px!important;}
  .m-height25 {font-size:25px!important;line-height:25px!important;height:25px!important;}
  .m-height30 {font-size:30px!important;line-height:30px!important;height:30px!important;}
  .radius6 {border-radius: 6px!important;}
  .fade-white {background-color: rgba(255, 255, 255, 0.8)!important;}
  .rwd-on-mobile {display: inline-block!important;padding: 5px!important;}
  .center-on-mobile {text-align: center!important;}
  .rwd-col {width:100%!important;max-width:100%!important;display:inline-block!important;}
}
</style>
<style type="text/css" class="export-delete"> 
  .composer--mobile table.row {width: 100%!important;max-width: 100%!important;}
  .composer--mobile td.row {width: 100%!important;max-width: 100%!important;}
  .composer--mobile .img-responsive img {width:100%!important;max-width: 100%!important;height: auto!important;margin: auto;}
  .composer--mobile .center-float {float: none!important;margin:auto!important;}
  .composer--mobile .center-text{text-align: center!important;}
  .composer--mobile .container-padding {width: 100%!important;padding-left: 15px!important;padding-right: 15px!important;}
  .composer--mobile .container-padding10 {width: 100%!important;padding-left: 10px!important;padding-right: 10px!important;}
  .composer--mobile .hide-mobile {display: none!important;}
  .composer--mobile .menu-container {text-align: center !important;}
  .composer--mobile .autoheight {height: auto!important;}
  .composer--mobile .m-padding-10 {margin: 10px 0!important;}
  .composer--mobile .m-padding-15 {margin: 15px 0!important;}
  .composer--mobile .m-padding-20 {margin: 20px 0!important;}
  .composer--mobile .m-padding-30 {margin: 30px 0!important;}
  .composer--mobile .m-padding-40 {margin: 40px 0!important;}
  .composer--mobile .m-padding-50 {margin: 50px 0!important;}
  .composer--mobile .m-padding-60 {margin: 60px 0!important;}
  .composer--mobile .m-padding-top10 {margin: 30px 0 0 0!important;}
  .composer--mobile .m-padding-top15 {margin: 15px 0 0 0!important;}
  .composer--mobile .m-padding-top20 {margin: 20px 0 0 0!important;}
  .composer--mobile .m-padding-top30 {margin: 30px 0 0 0!important;}
  .composer--mobile .m-padding-top40 {margin: 40px 0 0 0!important;}
  .composer--mobile .m-padding-top50 {margin: 50px 0 0 0!important;}
  .composer--mobile .m-padding-top60 {margin: 60px 0 0 0!important;}
  .composer--mobile .m-height10 {font-size:10px!important;line-height:10px!important;height:10px!important;}
  .composer--mobile .m-height15 {font-size:15px!important;line-height:15px!important;height:15px!important;}
  .composer--mobile .m-height20 {font-srobotoize:20px!important;line-height:20px!important;height:20px!important;}
  .composer--mobile .m-height25 {font-size:25px!important;line-height:25px!important;height:25px!important;}
  .composer--mobile .m-height30 {font-size:30px!important;line-height:30px!important;height:30px!important;}
  .composer--mobile .radius6 {border-radius: 6px!important;}
  .composer--mobile .fade-white {background-color: rgba(255, 255, 255, 0.8)!important;}
  .composer--mobile .rwd-on-mobile {display: inline-block!important;padding: 5px!important;}
  .composer--mobile .center-on-mobile {text-align: center!important;}
  .composer--mobile .rwd-col {width:100%!important;max-width:100%!important;display:inline-block!important;}
</style>
</head>

<body data-bgcolor="Body" style="margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;" bgcolor="#FFFFFF">

<span class="preheader-text" data-preheader-text style="color: transparent; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; visibility: hidden; width: 0; display: none; mso-hide: all;"></span>

<!-- Preheader white space hack -->
<div style="display: none; max-height: 0px; overflow: hidden;">
&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>

<div data-primary-font="Barlow" data-secondary-font="Rubik" style="display:none; font-size:0px; line-height:0px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; visibility:hidden; mso-hide:all;"></div>

<table border="0" align="center" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:100%;">
  <tr><!-- Outer Table -->
    <td align="center" data-bgcolor="Body" bgcolor="#FFFFFF" data-composer>


<table data-outer-table border="0" align="center" cellpadding="0" cellspacing="0" class="outer-table row" role="presentation" width="640" style="width:640px;max-width:640px;" data-module="blue-logo">
  <!-- blue-logo -->
  <tr>
    <td align="center" bgcolor="#FFFFFF" data-bgcolor="BgColor" class="container-padding">

    </td>
  </tr>
  <!-- blue-logo -->
</table>


<table data-outer-table border="0" align="center" cellpadding="0" cellspacing="0" class="outer-table row" role="presentation" width="640" style="width:640px;max-width:640px;" data-module="blue-preface-4">
  <!-- blue-preface-4 -->
  <tr>
    <td align="center" bgcolor="#FFFFFF" data-bgcolor="BgColor" class="container-padding">

<table data-inner-table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" class="inner-table row" width="580" style="width:580px;max-width:580px;">
  <tr>
    <td height="40" style="font-size:40px;line-height:40px;" data-height="Spacing top">&nbsp;</td>
  </tr>
  <tr>
    <td align="center" data-bgcolor="BgColor" bgcolor="#FFFFFF">
      <!-- content -->
      <table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="width:100%;max-width:100%;">
        <tr data-element="blue-subline" data-label="Sublines">
          <td class="center-text" data-text-style="Sublines" align="center" style="font-family:'Barlow',Arial,Helvetica,sans-serif;font-size:14px;line-height:24px;font-weight:900;font-style:normal;color:#277ffe;text-decoration:none;letter-spacing:1px;">
              <singleline>
                <div mc:edit data-text-edit>
                  CONGRATS
                </div>
              </singleline>
          </td>
        </tr>
        <tr data-element="blue-headline" data-label="Headlines">
          <td class="center-text" data-text-style="Headlines" align="center" style="font-family:'Barlow',Arial,Helvetica,sans-serif;font-size:48px;line-height:54px;font-weight:900;font-style:normal;color:#222222;text-decoration:none;letter-spacing:0px;">
              <singleline>
                <div mc:edit data-text-edit>
                  YOU'VE BEEN INVITED
                </div>
              </singleline>
          </td>
        </tr>
        <tr data-element="blue-headline" data-label="Headlines">
          <td height="15" style="font-size:15px;line-height:15px;" data-height="Spacing under headline">&nbsp;</td>
        </tr>
        <tr data-element="blue-paragraph" data-label="Paragraphs">
          <td class="center-text" data-text-style="Paragraphs" align="center" style="font-family:'Barlow',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;font-weight:400;font-style:normal;color:#333333;text-decoration:none;letter-spacing:0px;width: 500px !important;">
              <singleline>
                <div mc:edit data-text-edit>
                  ${adminName} has invited you to join Hazir as a Manager. Please click below to register yourself:
                </div>
              </singleline>
          </td>
        </tr>
        <tr data-element="blue-header-paragraph" data-label="Paragraphs">
          <td height="25" style="font-size:25px;line-height:25px;" data-height="Spacing under paragraph">&nbsp;</td>
        </tr>
        <tr data-element="blue-button" data-label="Buttons">
          <td align="center">
            <!-- Button -->
            <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" class="center-float">
              <tr>
                <td align="center" data-border-radius-default="0,6,36" data-border-radius-custom="Buttons" data-bgcolor="Buttons" bgcolor="#277ffe" style="border-radius: 0px; background-color: #277ffe !important;">
         
                    <singleline>
                      <a href="https://fyz-schedule-management.herokuapp.com/accept-manager-invitation?token=${token}" target="_blank" mc:edit data-button data-text-style="Buttons" style="font-family:'Barlow',Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;font-style:normal;color:#FFFFFF;text-decoration:none;letter-spacing:0px;padding: 15px 35px 15px 35px;display: inline-block;"><span>REGISTER</span></a>
                    </singleline>
                 
                </td>
              </tr>
            </table>
            <!-- Buttons -->
          </td>
        </tr>
      </table>
      <!-- content -->
    </td>
  </tr>
  <tr>
    <td height="40" style="font-size:40px;line-height:40px;" data-height="Spacing bottom">&nbsp;</td>
  </tr>
</table>

    </td>
  </tr>
  <!-- blue-preface-4 -->
</table>

<table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="width:100%;max-width:100%;" data-module="blue-footer">
  <tr>
    <td align="center" bgcolor="#F8F8F8" data-bgcolor="BgColor" data-border-color="Footer Border Color" class="container-padding" style="border-top: 10px solid #F1F1F1;">
      
<table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" class="row" width="520" style="width:520px;max-width:520px;">
  <tr data-element="blue-footer-social-icons" data-label="Social Icons">
    <td height="60" style="font-size:60px;line-height:60px;" data-height="Spacing under social icons">&nbsp;</td>
  </tr>
  <tr data-element="blue-footer-paragraphs" data-label="Paragraphs">
    <td align="center">
      <table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" class="row" width="480" style="width:480px;max-width:480px;">
        <tr>
          <td class="center-text" data-text-style="Paragraphs" align="center" style="font-family:'Barlow',Arial,Helvetica,sans-serif;font-size:14px;line-height:24px;font-weight:300;font-style:normal;color:#666666;text-decoration:none;letter-spacing:0px;">
            <multiline>
              <div mc:edit data-text-edit>
                2022 Hazir. All Rights Reserved.<br>
                Address name St. 24, City Name, State, Country Name
              </div>
            </multiline>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr data-element="blue-footer-paragraphs" data-label="Paragraphs">
    <td height="40" style="font-size:40px;line-height:40px;" data-height="Spacing above tags">&nbsp;</td>
  </tr>
 
</table>
<!-- Content -->

    </td>
  </tr>
  <!-- blue-footer -->
</table>

    </td>
  </tr><!-- Outer-Table -->
</table>

</body>
</html>

`;

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort = { _id: 1 }, search, filters, untaggedOnly = false } = req.query;

    const additionalQuery = {};

    if (res.locals.user.admin && filters.length === 1 && filters[0] === 'EMPLOYEE')
        additionalQuery.manager = res.locals.user._id;

    if (untaggedOnly == 'true') additionalQuery.tag = null;

    const results = await mongoose.model('User').paginate(
        {
            $and: [
                {
                    $or: [
                        { name: { $regex: `${search}`, $options: 'i' } },
                        { email: { $regex: `${search}`, $options: 'i' } },
                    ],
                },
                {
                    role: { $in: filters },
                    admin: res.locals.user.admin?._id || res.locals.user._id,
                    ...additionalQuery,
                },
            ],
        },
        {
            projection: { __v: 0, password: 0 },
            populate: [
                { path: 'manager', select: '_id email name' },
                { path: 'location', select: '_id name' },
            ],
            lean: true,
            page,
            limit,
            sort,
        }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await mongoose.model('User').deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await Model.findOne({ email: body.email });

    if (!user) return next(new AppError('Invalid email or password', 401));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));

    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email']);

    res.status(200).json({
        token,
        ...filteredUser,
    });
});

module.exports.inviteManagers = catchAsync(async function (req, res, next) {
    const emails = [...new Set(req.params.emails.replace(/\s/g, '').split(','))];
    const adminUser = res.locals.user;
    for (const email of emails) {
        if (!validator.validate(email)) return next(new AppError('One or more emails are invalid', 400));
    }

    const [managers, admins] = await Promise.all([
        mongoose
            .model('User')
            .find({ role: 'MANAGER', email: { $in: emails } })
            .lean(),
        mongoose
            .model('AdminUser')
            .find({ email: { $in: emails } })
            .lean(),
    ]);

    if (managers.length > 0 || admins.length > 0)
        return next(new AppError('One or more emails are already in use', 400));

    for (const email of emails) {
        const ManagerUser = await mongoose.model('User').create({ email, admin: res.locals.user._id, role: 'MANAGER' });
        const token = signToken({ adminid: adminUser._id, managerid: ManagerUser._id });
        await sgMail.send({
            to: email, // Change to your recipient
            from: process.env.SENDGRID_SENDER_EMAIL, // Change to your verified sender
            subject: `Hazir | You've been invited`,
            // text: 'and easy to do anywhere, even with Node.js',
            html: getInvitationEmail({ token, adminName: adminUser.name }),
        });
    }

    res.status(200).send();
});

module.exports.importEmployees = catchAsync(async function (req, res, next) {
    let groups = [];
    if (req.query.groups !== 'null') {
        groups = req.query.groups.split(',');
        for (const group of groups) {
            if (!mongoose.isValidObjectId(group)) return next(new AppError('Please enter valid id(s)', 400));
        }
        groups = groups.map((id) => mongoose.Types.ObjectId(id));
    }
    const employees = await csv().fromString(req.file.buffer.toString());
    const managerEmails = [];
    employees.forEach((e) => {
        if (e.manager) managerEmails.push(e.manager);
    });
    const uniqueManagerEmails = [...new Set(managerEmails)];
    const managers = await User.find({ role: 'MANAGER', email: { $in: uniqueManagerEmails } }, '_id email').lean();

    if (managers.length < uniqueManagerEmails.length) return next(new AppError('Manager(s) does not exist', 404));

    const employeesToBeCreated = employees.map((e) => {
        const correspondingManager = managers.find((m) => m.email.toString() === e.manager);
        const returningEmployee = {
            ...e,
            passwordConfirm: e.password,
            groups,
            admin: res.locals.user._id,
            role: 'EMPLOYEE',
        };

        delete returningEmployee.manager;

        if (correspondingManager) returningEmployee.manager = correspondingManager._id;

        return returningEmployee;
    });

    await User.create(employeesToBeCreated);

    res.status(200).json();
});

module.exports.getSampleFile = catchAsync(async function (req, res, next) {
    res.download(path.join(__dirname, '..', 'public/sample-employees.csv'));
});

module.exports.decodeToken = catchAsync(async function (req, res, next) {
    const { token } = req.params;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const admin = await mongoose.model('AdminUser').findById(decoded.id, { __v: 0, password: 0 }).lean();
    if (!admin) return next(new AppError('User does not exist'));

    res.status(200).json(admin);
});

module.exports.assignManager = catchAsync(async function (req, res, next) {
    const adminid = res.locals.user._id;
    const employeeids = [...new Set(req.body.employeeids)];
    const { managerid } = req.params;
    const locationid = req.body.location;
    if (!locationid || !mongoose.isValidObjectId(locationid))
        return next(new AppError('Please enter a valid location id', 400));

    const location = await mongoose.model('Location').findById(locationid);
    if (!location) return next(new AppError('Location does not exist', 404));

    if (!managerid || !mongoose.isValidObjectId(managerid))
        return next(new AppError('Please enter a valid manager id', 400));
    const manager = await mongoose.model('User').findById(managerid);
    if (!manager) return next(new AppError('Manager does not exist', 404));
    if (manager.role !== 'MANAGER') return next(new AppError('Manager does not exist', 404));

    for (const employeeid of employeeids) {
        if (!employeeid || !mongoose.isValidObjectId(employeeid))
            return next(new AppError('Please enter a valid id', 400));
    }
    const employees = await mongoose
        .model('User')
        .find({
            _id: {
                $in: employeeids,
            },
            admin: adminid,
        })
        .lean();
    if (employeeids.length !== employees.length) return next(new AppError('Invalid Employees', 400));
    await mongoose.model('User').updateMany(
        {
            _id: {
                $in: employeeids,
            },
        },
        { manager: managerid, location: locationid, isConfirmed: true }
    );
    res.status(200).send();
});
