const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, uriMongo } = require("./database.js");
const ck = new Telegraf(process.env.BOT_TOKEN);

//library IBM
const fs = require("fs");
const VisualRecognitionV3 = require("ibm-watson/visual-recognition/v3");
const { IamAuthenticator } = require("ibm-watson/auth");

const client = new MongoClient(uriMongo, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});
async function run(query) {
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const db = client.db("cekal");
    // Use the collection "people"
    const col = db.collection("makanan");
    // Construct a document
    // Find one document
    const data = await col.find(query).toArray();
    //console.log(data);
    return data;
    // Print to the console
  } catch (err) {
    console.log(err.stack);
  }
}

// download photos
const downloadPhotoMiddleware = (ctx, next) => {
  return ck.telegram.getFileLink(ctx.message.photo[0]).then((link) => {
    ctx.state.fileLink = link;
    return next();
  });
};

ck.start((ctx) => ctx.reply("Welcome"));
ck.help((ctx) => ctx.reply("Send me a sticker"));
ck.on("sticker", (ctx) => ctx.reply("👍"));
ck.hears("hi", (ctx) => ctx.reply("=Hey there"));
ck.hears("/bukal", (ctx) => ctx.reply("Fitur ini sedang dalam pengembangan."));
ck.hears("/cekal", (ctx) => {
  ctx.reply('Silahkan upload foto makanan yang ingin dianalisis kalorinya.');
});
//ck.launch();

// handle photo input
ck.on("photo", downloadPhotoMiddleware, (ctx, next) => {
  ctx.reply('Gambar sedang diproses...');
  //console.log(ctx.update.message.photo.length);
  const panjang = ctx.update.message.photo.length;
  const link = ctx.update.message.photo[panjang-1].file_id;
  ctx.telegram.getFileLink(link).then((linkGambar) => {
    //console.log(linkGambar);
    //IBM Eksekusi
    const visualRecognition = new VisualRecognitionV3({
      version: "2018-03-19",
      authenticator: new IamAuthenticator({
        apikey: "OoON2Y_o8AdF1mcQxvJWNDBAmjzudrdHxGd4E5r4Vxp9",
      }),
      url:
        "https://api.us-south.visual-recognition.watson.cloud.ibm.com/instances/6a2cddb7-ef6d-4b5b-b988-c9f52c6a88fd",
    });

    const classifyParams = {
      url: linkGambar
    };
    
    visualRecognition
      .classify(classifyParams)
      .then((response) => {
        const classifiedImages = response.result;
        const hasil =
          classifiedImages.images[0].classifiers[0].classes[0].class;

        //ctx.reply(hasil);
        //run({ name: /^hasil$/i });
        //const makanan = run({ name: new RegExp('^'+hasil+'$','i') });
        const makanan = run({ name: {'$regex' : hasil, '$options' : 'i'} });
        makanan.then(dataMakanan => {
           ctx.reply(`Nama makanan adalah ${dataMakanan[0].nama} memiliki ${dataMakanan[0].kalori} kalori tiap ${dataMakanan[0].satuan} gram`);
        }).catch(error => ctx.reply('Maaf data makanan belum ada'));
       
        console.log(JSON.stringify(classifiedImages, null, 2));
      })
      .catch((err) => {
        console.log("error:", err);
      });
  });
});

// telegraf error handling
ck.catch((err) => {
  console.log("Error: ", err);
});

ck.startPolling();
