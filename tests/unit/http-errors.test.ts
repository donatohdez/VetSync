import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { gzipSync } from "node:zlib";
import { createApp, type Services } from "../../src/http/app.js";
import { AppError } from "../../src/shared/errors.js";

const options = { timeZone: "America/Hermosillo", reminderHours: 24 };
let failure: unknown = null;
const services = {
  owners: {
    create: async () => {
      throw failure;
    },
    list: async () => [],
  },
  medicalRecords: {
    list: async (petId: string) => [{ petId }],
    create: async () => ({}),
  },
  sendReminders: { execute: async () => ({ sent: 0 }) },
} as unknown as Services;
const app = createApp(services, options);
const json = (path: string) =>
  request(app).post(path).set("Content-Type", "application/json");

afterEach(() => {
  failure = null;
  vi.restoreAllMocks();
});

describe("cuerpos con codificación o charset no admitidos (F-06)", () => {
  it("responde 415 con un charset distinto de UTF-8", async () => {
    const response = await request(app)
      .post("/api/owners")
      .set("Content-Type", "application/json; charset=iso-8859-1")
      .send("{}")
      .expect(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_CHARSET");
    expect(response.text).not.toMatch(/ISO-8859-1|stack|node_modules/i);
  });
  it("responde 415 con un charset inexistente", async () => {
    await request(app)
      .post("/api/owners")
      .set("Content-Type", "application/json; charset=nombre-falso")
      .send("{}")
      .expect(415);
  });
  it("responde 415 con una codificación de contenido desconocida", async () => {
    const response = await json("/api/owners")
      .set("Content-Encoding", "desconocida")
      .send("{}")
      .expect(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_CONTENT_ENCODING");
  });
  it.each(["gzip", "br", "deflate"])(
    "responde 400 con cuerpo inválido para %s",
    async (encoding) => {
      const response = await json("/api/owners")
        .set("Content-Encoding", encoding)
        .send("esto no esta comprimido")
        .expect(400);
      expect(response.body.error.code).toBe("INVALID_BODY_ENCODING");
      expect(response.text).not.toMatch(/Z_DATA|header check|errno/i);
    },
  );
  it("sigue aceptando un cuerpo gzip válido", async () => {
    failure = new AppError("VALIDATION_ERROR", "llegó al servicio", 400);
    const response = await json("/api/owners")
      .set("Content-Encoding", "gzip")
      // superagent serializaría el Buffer como JSON: se envía tal cual.
      .serialize((body) => body)
      .send(gzipSync("{}") as unknown as object)
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("parámetros de ruta mal codificados (F-06)", () => {
  it("responde 400 y no 500 con porcentaje truncado", async () => {
    const response = await request(app)
      .get("/api/pets/%E0%A4%A/medical-records")
      .expect(400);
    expect(response.body.error.code).toBe("INVALID_PARAMETER");
    expect(response.text).not.toContain("%E0%A4%A");
  });
  it("responde 400 también en POST", async () => {
    await json("/api/pets/%E0%A4%A/medical-records").send("{}").expect(400);
  });
  it("una ruta bien codificada llega al servicio", async () => {
    const response = await request(app)
      .get("/api/pets/%20abc%20/medical-records")
      .expect(200);
    expect(response.body).toEqual([{ petId: " abc " }]);
  });
});

describe("mapeo explícito de errores del cuerpo", () => {
  it.each([
    ["request.aborted", 400, "REQUEST_ABORTED"],
    ["request.size.invalid", 400, "INVALID_REQUEST_SIZE"],
    ["entity.verify.failed", 403, "BODY_VERIFICATION_FAILED"],
  ])("traduce %s a %i", async (type, status, code) => {
    failure = Object.assign(new Error("detalle interno xyz"), { type });
    const response = await json("/api/owners").send("{}").expect(status);
    expect(response.body.error.code).toBe(code);
    expect(response.text).not.toContain("detalle interno");
  });
  it("stream.encoding.set es un fallo interno y se mantiene en 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failure = Object.assign(new Error("detalle interno xyz"), {
      type: "stream.encoding.set",
    });
    const response = await json("/api/owners").send("{}").expect(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.text).not.toContain("detalle interno");
  });
  it.each([
    { status: 418 },
    { statusCode: 400 },
    { status: 400, expose: true },
    { status: 404, type: "desconocido" },
  ])(
    "no confía en una propiedad status arbitraria %j: responde 500",
    async (props) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      failure = Object.assign(new Error("detalle interno xyz"), props);
      const response = await json("/api/owners").send("{}").expect(500);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
      expect(response.text).not.toContain("detalle interno");
    },
  );
  it("conserva los AppError del dominio", async () => {
    failure = new AppError("VALIDATION_ERROR", "mal", 400);
    await json("/api/owners").send("{}").expect(400);
  });
});

describe("POST /api/notifications/run exige cuerpo vacío (F-19)", () => {
  it.each([[{}], [undefined]])("acepta %j", async (body) => {
    const req = json("/api/notifications/run");
    await (body === undefined ? req.send() : req.send(body)).expect(200);
  });
  it.each([["[]"], ['{"x":1}'], ['{"hours":1}'], ["[{}]"]])(
    "rechaza %s con 400 VALIDATION_ERROR",
    async (body) => {
      const response = await json("/api/notifications/run")
        .send(body)
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    },
  );
  it("mantiene 415 sin Content-Type JSON", async () => {
    await request(app)
      .post("/api/notifications/run")
      .set("Content-Type", "text/plain")
      .send("{}")
      .expect(415);
  });
});
