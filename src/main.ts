import express, { request, response, Router } from "express";
import cors from "cors";
import axios from "axios";

const app = express();

app.use(cors());

app.use(express.json())

const router = Router();

app.use(router);

router.get("/", (request, response) => {
  response.status(200).json({ status: "Rodando !" });
});

router.get("/clima", async (request, response) => {
  const { lat, lon } = request.query;

  const url = 'https://power.larc.nasa.gov/api/temporal/hourly/point';
  const parameters = {
    parameters: 'T2M,RH2M,PRECTOTCORR',
    community: 'AG',
    longitude: lon,
    latitude: lat,
    start: '20241003',
    end: '20241003',
    format: 'JSON'
  };

  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data
    });
  } catch (error) {
    response.status(500).end("Error");
  }

});

router.get("/today", async (request, response) => {
  const { lat, lon } = request.query;
  const url = "https://api.openweathermap.org/data/3.0/onecall";

  const parameters = {
    lat, lon, appid: "a74c9dfe5765762d5e53a697c65505ac", lang: "pt_br", units: "metric"
  };
  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data
    });
  } catch (error) {
    console.log(error);
    response.status(500).end("Error");
  }
})

router.get("/overview", async (request, response) => {
  const { lat, lon } = request.query;
  const url = "https://api.openweathermap.org/data/3.0/onecall/overview";

  const parameters = {
    lat, lon, appid: "a74c9dfe5765762d5e53a697c65505ac", lang: "pt_br", units: "metric"
  };
  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data
    });
  } catch (error) {
    console.log(error);
    response.status(500).end("Error");
  }
})

//// https://power.larc.nasa.gov/api/temporal/hourly/point?start=20241003&end=20241003&latitude=-24.035&longitude=-52.3462&community=AG&parameters=T2M,RH2M,PRECTOTCORR&format=JSON&theme=light&user=DAVE
/*
async function getWeatherData() {
  try {
    const response = await axios.get(url, { params: parameters });
    const data = response.data;

    console.log("Dados de Temperatura Horária (°C):");
    const temperaturas = data.properties.parameter.T2M;

    for (const date in temperaturas) {
      console.log(`Data: ${date}`);
      for (const hour in temperaturas[date]) {
        console.log(`Hora ${hour}: ${temperaturas[date][hour]}°C`);
      }
    }
  } catch (error) {
    console.error(`Erro na requisição: ${error}`);
  }
}
getWeatherData();
*/


app.listen(5000, () => {
  console.log("[Server]: http://localhost:5000");
});