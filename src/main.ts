import express, {
  NextFunction,
  request,
  Request,
  Response,
  Router,
} from "express";
import cors from "cors";
import axios from "axios";
import OpenAI from "openai";

const app = express();

app.use(cors());

app.use(express.json());

const router = Router();

app.use(router);

router.get("/", (request, response) => {
  response.status(200).json({ status: "Rodando !" });
});

router.get("/clima", async (request, response) => {
  const { lat, lon } = request.query;

  const url = "https://power.larc.nasa.gov/api/temporal/hourly/point";
  const parameters = {
    parameters: "T2M,RH2M,PRECTOTCORR",
    community: "AG",
    longitude: lon,
    latitude: lat,
    start: "20241003",
    end: "20241003",
    format: "JSON",
  };

  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data,
    });
  } catch (error) {
    response.status(500).end("Error");
  }
});

router.get("/today", async (request, response) => {
  const { lat, lon } = request.query;
  const url = "https://api.openweathermap.org/data/3.0/onecall";

  const parameters = {
    lat,
    lon,
    appid: "a74c9dfe5765762d5e53a697c65505ac",
    lang: "pt_br",
    units: "metric",
  };
  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data,
    });
  } catch (error) {
    console.log(error);
    response.status(500).end("Error");
  }
});

router.get("/overview", async (request, response) => {
  const { lat, lon } = request.query;
  const url = "https://api.openweathermap.org/data/3.0/onecall/overview";

  const parameters = {
    lat,
    lon,
    appid: "a74c9dfe5765762d5e53a697c65505ac",
    lang: "pt_br",
    units: "metric",
  };
  try {
    const responseAPI = await axios.get(url, { params: parameters });
    const data = responseAPI.data;

    response.status(200).json({
      ...data,
    });
  } catch (error) {
    console.log(error);
    response.status(500).end("Error");
  }
});

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

app.get(
  "/chat",
  asyncMiddleware(async (request: Request, response: Response) => {
    const { lat, lon, culture } = request.query;
    const localInfos = await getLocalInfos(lat, lon);

    const params = {
      culture: culture || "any",
      city: localInfos.results[0].components.municipality,
      state: localInfos.results[0].components.state,
      country: localInfos.results[0].components.country,
      continent: localInfos.results[0].components.continent,
      latitude: lat || localInfos.results[0].geometry.lat,
      longitude: lon || localInfos.results[0].geometry.lng,
    };

    try {
      console.info("Starting main process...");
      const nasaData = await getNasaData(params.latitude, params.longitude);
      const processedData = processNasaData(nasaData);
      const weatherReport = generateWeatherReport(processedData);
      const aiResponse = await fetchOpenAICompletion(
        String(params.culture),
        params.city,
        params.state,
        params.country,
        params.continent,
        params.latitude,
        params.longitude,
        weatherReport
      );

      console.info("AI Response:", aiResponse);
      return response.status(200).json({ message: aiResponse });
    } catch (error: any) {
      console.error("Erro ao processar os dados:", error.message);
    }
  })
);

const monthNames = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

function formatMonthYear(monthYear: string) {
  const year = monthYear.slice(0, 4);
  const month = monthYear.slice(4, 6);
  const monthName = monthNames[month as keyof typeof monthNames];
  return `${monthName} de ${year}`;
}

const nasaApiUrl = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const openApiKey =
  "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";

async function getNasaData(latitude: number, longitude: number) {
  const url = `${nasaApiUrl}?parameters=T2M,PRECTOTCORR&community=ag&start=2017&end=2022&format=json&latitude=${latitude}&longitude=${longitude}`;

  console.info(`Fetching NASA data for lat: ${latitude}, lon: ${longitude}`);

  try {
    const response = await axios.get(url);
    console.debug("NASA API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from NASA: ${error}`);
    throw new Error(`Erro ao buscar dados da NASA: ${error}`);
  }
}

function processNasaData(data: {
  properties: { parameter: { T2M: any; PRECTOTCORR: any } };
}) {
  console.info("Processing NASA data...");
  const processedData: Record<string, { temp: number; rain: number }> = {};
  const { T2M, PRECTOTCORR } = data.properties.parameter;

  for (const month in T2M) {
    processedData[month] = {
      temp: T2M[month],
      rain: PRECTOTCORR[month],
    };
    console.debug(
      `Processed data for month ${month}: temp = ${T2M[month]}, rain = ${PRECTOTCORR[month]}`
    );
  }

  return processedData;
}

function generateWeatherReport(data: {
  [x: string]: { temp: any; rain: any };
}) {
  console.info("Generating weather report...");
  let prompt =
    "Média do clima mensal da região de 2017 à 2022. No formato (mês do ano): Temperatura média em °C - Preciptacação em mm/dia:\n";

  for (const month in data) {
    if (month.slice(4, 6) === "13") {
      console.warn(`Ignorando mês inválido no relatório: ${month}`);
      continue;
    }
    const formattedMonthYear = formatMonthYear(month);
    prompt += `${formattedMonthYear}: ${data[month].temp} °C - ${data[month].rain} mm/dia.\n`;
  }

  console.debug("Generated weather report:", prompt.trim());
  return prompt.trim();
}

async function getLocalInfos(lat: any, lon: any) {
  console.log(`Buscando dados locais para lat: ${lat}, lon: ${lon}`);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat},${lon}&key=050c3862de804a2b990b34205fffc811`;

  try {
    const response = await axios.get(url);

    return response.data;
  } catch (error: any) {
    console.log(`Erro ao buscar dados locais: ${error.message}`);
    throw new Error(`Erro ao buscar dados locais: ${error}`);
  }
}

async function fetchOpenAICompletion(
  culture: string,
  city: string,
  state: string,
  country: string,
  continent: string,
  latitude: number,
  longitude: number,
  weatherData: string
) {
  console.info(
    `Fetching OpenAI completion for ${culture} in ${city}, ${state}, ${country}, ${continent}`
  );

  const client = new OpenAI({
    apiKey: openApiKey,
  });

  const prompt = `
    Dados para o Relatório de Plantio e Manejo de Irrigação
  
        Informações sobre a Cultura:
            Cultura: ${culture}
  
        Informações sobre a Região:
            Cidade: ${city}
            Estado: ${state}
            País: ${country}
            Continente: ${continent}
            Latitude: ${latitude}
            Longitude: ${longitude}
  
        Dados Meteorológicos:
            ${weatherData}
  
    Instruções para gerar o relatório: 
  
        Recomendações de plantio: Use os dados meteorológicos obtidos (como temperatura e precipitação) para sugerir o período ideal de plantio. Assegure-se de considerar a necessidade específica de cada cultura em termos de temperatura e umidade do solo. Inclua dados como o mês recomendado para o plantio com base na preciptação histórica da região (seca/chuvosa).
  
        Manejo de irrigação: Utilize os dados de precipitação e temperatura para identificar os períodos em que será necessário complementar com irrigação. Indique métodos de irrigação adequados, baseando-se na localização de plantio e na disponibilidade hídrica natural durante o ciclo de crescimento.
            Embasamento: As recomendações de irrigação devem ser baseadas na precipitação média mensal e na demanda hídrica da cultura. Incluir sugestões de técnicas de irrigação adequadas à cultura e a região.
  
        Prevenção de inundações ou encharcamentos: Caso os dados indiquem risco de precipitações elevadas, mencione possíveis problemas com inundações ou encharcamento do solo. Sugira medidas para mitigar esses riscos.
            Embasamento: As recomendações devem ser baseadas nos níveis de precipitação previstos, características do solo da região, e topografia da ��rea. Inclua informações sobre práticas de manejo do solo que possam prevenir acúmulo de água.
  
        Economia de água e sustentabilidade: Inclua dicas para otimizar o uso de água, levando em consideração a necessidade da cultura e os períodos secos. Sugira técnicas como por exemplo captação de água da chuva, cobertura do solo (mulching), e irrigação eficiente para evitar desperdícios.
            Embasamento: Essas práticas devem estar embasadas em dados sobre o regime de chuvas, o ciclo da cultura e as práticas de manejo sustentável da água. Incluir métodos comprovados de retenção de umidade e técnicas de irrigação de precisão.
  
        Conclusão: Finalize o relatório com um resumo das principais recomendações, ressaltando os benefícios de seguir o planejamento sugerido para garantir uma colheita bem-sucedida e sustentável. Indique a importância de monitorar as condições climáticas e ajustar o manejo conforme necessário.
    `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    console.debug("OpenAI response:", JSON.stringify(response, null, 2));
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error fetching OpenAI completion:", error);
    throw error;
  }
}

function asyncMiddleware(fn: Function) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res)).then(() => next());
  };
}

app.listen(5000, () => {
  console.log("[Server]: http://localhost:5000");
});
