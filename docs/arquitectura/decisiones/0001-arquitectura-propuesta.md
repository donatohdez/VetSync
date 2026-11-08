# ADR 0001: monolito modular

Estado: aceptado tras la aprobación del plan y la autorización de inicio.

## Contexto

La presentación permite microservicios o un monolito modular desacoplado. El núcleo combina registros, agenda e historial con persistencia transaccional. El plazo favorece un solo proceso desplegable.

## Propuesta

Un backend TypeScript sobre Node.js, MySQL, API HTTP y una interfaz web pequeña servida por el mismo proyecto. Módulos de propietarios, mascotas, veterinarios, historial, citas y notificaciones. Pruebas con Vitest; Express y mysql2 son candidatos para transporte y persistencia. Verificar compatibilidad y fijar versiones al implementar.

Los casos de uso dependen de puertos; los adaptadores implementan repositorios, transacciones, reloj y correo simulado. La composición se realiza al arrancar. Cada módulo es dueño de sus tablas y no accede directamente a repositorios internos de otros módulos.

## Consecuencias

Menos infraestructura y arranque más sencillo; no exige comunicación de red interna. El desacoplamiento debe demostrarse con límites e inyección de dependencias, no solo carpetas. El código SQL y las transacciones requieren pruebas de integración en MySQL real. No se afirma que esta elección ya esté implementada o validada.

## Alternativas

Microservicios: más configuración, despliegues y fallos distribuidos para el mismo alcance académico. Python o Java: alternativas válidas si el estudiante las domina mejor; confirmar antes del primer código de aplicación.
