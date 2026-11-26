/* Decision Studio v4.2 · decision-studio-data.js */
/* Plantilla genérica de decisiones técnicas. */
window.DecisionData = {
  "groups": [
    {
      "id": 0,
      "name": "Infraestructura y nube",
      "short": "Infraestructura",
      "number": "01",
      "description": "Validar habilitación del entorno y controles de plataforma."
    },
    {
      "id": 1,
      "name": "Repositorios, IaC y CI/CD",
      "short": "DevOps",
      "number": "02",
      "description": "Confirmar el flujo de código e infraestructura reproducible."
    },
    {
      "id": 2,
      "name": "Seguridad y DevSecOps",
      "short": "Seguridad",
      "number": "03",
      "description": "Establecer los controles obligatorios antes del primer despliegue."
    },
    {
      "id": 3,
      "name": "Arquitectura de aplicaciones e IA",
      "short": "IA / Agentes",
      "number": "04",
      "description": "Acordar el stack agéntico y la integración con la plataforma corporativa."
    },
    {
      "id": 4,
      "name": "Identidad, integraciones y datos",
      "short": "Integraciones",
      "number": "05",
      "description": "Asegurar identidades, fuentes y permisos de consulta."
    },
    {
      "id": 5,
      "name": "Coordinación y criterios de aceptación",
      "short": "Gobierno",
      "number": "06",
      "description": "Cerrar interlocutores, agenda y criterios verificables."
    }
  ],
  "questions": [
    {
      "id": 1,
      "group": 0,
      "question": "¿Qué proyecto, región y cuenta de facturación se utilizarán para el sandbox de las soluciones?",
      "suggestion": "Considerar un proyecto nube dedicado al sandbox dentro del entorno de el cliente, con región permitida, billing activo y propietario técnico designado.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Proyecto sandbox dedicado del cliente + billing confirmado",
        "Proyecto sandbox existente y compartido autorizado",
        "Proyecto pendiente de creación"
      ]
    },
    {
      "id": 2,
      "group": 0,
      "question": "¿Qué esquema de accesos, roles e identidades se utilizará para el equipo de implementación?",
      "suggestion": "Asignar responsables de IAM y conceder permisos mínimos por función (infraestructura, despliegue, operación y auditoría); evitar credenciales personales compartidas.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Acceso por grupos IAM con privilegios mínimos",
        "Acceso temporal por roles IAM a personal del equipo implementador",
        "Acceso en proceso de aprobación"
      ]
    },
    {
      "id": 3,
      "group": 0,
      "question": "¿Qué topología de red y mecanismos de conectividad y administración se utilizarán?",
      "suggestion": "Determinar VPC/subredes, DNS, rutas, conectividad de los servicios elegidos, restricciones de salida y administración. Si se utiliza una VM privada, evaluar Cloud NAT e IAP; no presuponer que se requiere un runner GitLab.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "VPC existente del cliente; acceso privado y salida controlada",
        "VPC dedicada al sandbox; acceso privado y salida controlada",
        "Red corporativa/híbrida con VPN o interconexión",
        "Arquitectura sin VM runner; servicios administrados",
        "Diseño de red pendiente de definición"
      ]
    },
    {
      "id": 4,
      "group": 0,
      "question": "¿Qué políticas corporativas y restricciones de infraestructura se deben aplicar?",
      "suggestion": "Compartir restricciones de Organization Policy, regiones, exposición a Internet, Cloud Run, cuentas de servicio, cifrado y acceso a datos. Incorporarlas al diseño Terraform antes de desplegar.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Se entregan políticas de organización y baseline de seguridad",
        "Se aplican estándares corporativos documentados",
        "Restricciones por consolidar con Seguridad"
      ]
    },
    {
      "id": 5,
      "group": 1,
      "question": "¿Qué plataforma de repositorios de código fuente y qué herramienta de CI/CD se elegirán para el proyecto?",
      "suggestion": "Evaluar primero la plataforma corporativa disponible, permisos, licenciamiento, acceso de el equipo implementador e integración con nube. La selección definitiva debe quedar documentada.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "GitHub Enterprise + GitHub Actions",
        "GitLab + GitLab CI/CD",
        "Azure Repos + Azure Pipelines",
        "Google Cloud Secure Source Manager + Cloud Build",
        "Repositorio y CI/CD en plataformas diferentes",
        "Plataforma aún por seleccionar"
      ]
    },
    {
      "id": 6,
      "group": 1,
      "question": "¿Dónde se ejecutarán los pipelines de CI/CD y qué modalidad de runner o agente de ejecución se utilizará?",
      "suggestion": "Comparar ejecutores hospedados, VM privada GCE y servicio administrado según la plataforma CI/CD elegida. Verificar conectividad saliente, acceso a registros y nube, aislamiento, costos y mantenimiento. Elegir según los estándares del cliente.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Runner/agente autogestionado en VM privada de Compute Engine",
        "Runner/agente autogestionado en infraestructura corporativa",
        "Runner/agente hospedado por la plataforma CI/CD",
        "Google Cloud Build (sin VM runner propia)",
        "Modelo híbrido según tipo de pipeline",
        "Pendiente de evaluación técnica"
      ]
    },
    {
      "id": 7,
      "group": 1,
      "question": "¿Qué herramienta de IaC se utilizará desde la prueba de concepto y dónde se almacenará su estado?",
      "suggestion": "Recomendar Terraform desde el sandbox; almacenar tfstate en un bucket Cloud Storage específico, con versionado, acceso mínimo y bloqueo de estado. Acordar quién crea el backend inicialmente.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Terraform + estado remoto en Cloud Storage",
        "Terraform + backend corporativo existente",
        "OpenTofu + almacenamiento remoto compatible",
        "Google Cloud Infrastructure Manager",
        "Otra IaC / estrategia aprobada",
        "Pendiente de evaluación"
      ]
    },
    {
      "id": 8,
      "group": 1,
      "question": "¿Qué repositorio de artefactos se utilizará para imágenes, librerías y paquetes?",
      "suggestion": "Definir almacén de imágenes y paquetes según políticas, permisos, escaneo, conectividad y costos. Artifact Registry aparece ",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P1",
      "options": [
        "Google Artifact Registry",
        "JFrog Artifactory corporativo",
        "Azure Artifacts / Azure Container Registry",
        "GitHub Packages / GitHub Container Registry",
        "Registro corporativo distinto",
        "Por definir"
      ]
    },
    {
      "id": 9,
      "group": 1,
      "question": "¿Cómo se organizarán los repositorios y qué reglas de ramas, revisión y despliegue se aplicarán?",
      "suggestion": "Proponer un repositorio IaC y otro de aplicaciones con carpetas por caso; proteger ramas, exigir merge requests, revisión y validaciones automáticas. Ajustar al estándar corporativo.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Dos repos: infraestructura y aplicaciones (carpetas por caso)",
        "Repositorio por caso + repositorio IaC central",
        "Monorepo con carpetas IaC / agentes / contratos"
      ]
    },
    {
      "id": 10,
      "group": 2,
      "question": "¿Qué herramientas de seguridad se utilizarán para analizar código, dependencias, secretos, contenedores e IaC?",
      "suggestion": "Integrar controles existentes de SAST, análisis de dependencias (SCA), secretos, IaC y contenedores. Si no existen, evaluar alternativas como Semgrep/Bandit, pip-audit, Gitleaks, Checkov y Trivy.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Herramientas corporativas SAST/SCA/Secrets/Container/IaC",
        "Semgrep/Bandit + pip-audit + Gitleaks + Trivy + Checkov",
        "Definición pendiente con Seguridad / AppSec"
      ]
    },
    {
      "id": 11,
      "group": 2,
      "question": "¿Qué solución se utilizará para almacenar y administrar secretos de aplicaciones y pipelines?",
      "suggestion": "Seleccionar gestor central de secretos y revisar rotación, auditoría, acceso de aplicaciones y pipelines. Secret Manager figura Elegir según los estándares del cliente.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P1",
      "options": [
        "Google Secret Manager",
        "HashiCorp Vault corporativo",
        "Azure Key Vault",
        "Gestor de secretos integrado a la plataforma CI/CD",
        "Modelo híbrido / integración con vault existente",
        "Por definir"
      ]
    },
    {
      "id": 12,
      "group": 2,
      "question": "¿Cómo se autenticarán los pipelines ante la nube y otros servicios?",
      "suggestion": "Priorizar credenciales de corta duración: identidad de la VM mediante su cuenta de servicio en GCE, o Workload Identity Federation si aplica a un runner externo. No almacenar claves JSON persistentes en Git.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Workload Identity Federation / OIDC",
        "Cuenta de servicio asociada a VM GCE",
        "Identidad federada corporativa equivalente",
        "Credenciales de corta duración emitidas por gestor corporativo",
        "Mecanismo pendiente de aprobación"
      ]
    },
    {
      "id": 13,
      "group": 2,
      "question": "¿Qué controles y aprobaciones serán obligatorios para permitir un despliegue?",
      "suggestion": "Definir aprobaciones, severidades de hallazgos, excepciones autorizadas, auditoría de cambios y política de promoción. Mantener evidencia de pruebas, escaneo y aprobaciones por versión.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial–fase de diseño",
      "priority": "P1",
      "options": [
        "Checks obligatorios + aprobación de MR + bloqueos por severidad",
        "Matriz de excepciones y aprobación de Seguridad",
        "Políticas de bloqueo aún por definir"
      ]
    },
    {
      "id": 14,
      "group": 3,
      "question": "¿Qué lenguajes, frameworks y servicios de ejecución se elegirán para implementar cada caso de uso?",
      "suggestion": "Determinar lenguaje, framework y runtime por patrón de solución. Seleccionar el patrón adecuado para cada caso.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Python + Google ADK + Cloud Run",
        "Python + Google ADK + Agent Runtime",
        "Stack mixto según caso (NotebookLM, workflow, ADK)",
        "TypeScript / JavaScript + runtime aprobado",
        "Otra combinación corporativa",
        "Pendiente de diseño por caso"
      ]
    },
    {
      "id": 15,
      "group": 3,
      "question": "¿Cómo accederán los usuarios a las soluciones y con qué canales o plataformas corporativas se integrarán?",
      "suggestion": "Definir el canal de entrada por caso y el mecanismo concreto de publicación/autenticación entre los canales de acceso y los componentes de ejecución; no asumir interoperabilidad automática.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Gemini Enterprise como interfaz única",
        "Interfaz web independiente por caso",
        "Gemini Enterprise para algunos casos + interfaz propia para otros",
        "Interfaces corporativas existentes (p. ej., Teams)",
        "Pendiente de prueba de integración y experiencia"
      ]
    },
    {
      "id": 16,
      "group": 3,
      "question": "¿Qué servicios, modelos, licencias, APIs y cuotas estarán habilitados para las pruebas?",
      "suggestion": "Verificar habilitación de APIs, permisos, licencias, modelos Gemini, cuotas, presupuesto, límites de tokens y servicios de observabilidad (Logging, Trace y Monitoring).",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "APIs, licencias, modelos y cuotas habilitados en sandbox",
        "Habilitación parcial con cronograma y responsables",
        "Validación de capacidades pendiente"
      ]
    },
    {
      "id": 17,
      "group": 3,
      "question": "¿Qué patrón de solución se utilizará para las necesidades de conocimiento y consulta documental?",
      "suggestion": "Evaluar soluciones configurables, RAG administrado o componentes desarrollados a medida según permisos, necesidades de integración y mantenimiento.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de aprobación del diseño",
      "priority": "P1",
      "options": [
        "Servicio de consulta documental administrado",
        "Aplicación RAG desarrollada a medida",
        "Combinación de solución administrada y componentes propios",
        "Solución corporativa existente",
        "Pendiente de evaluación"
      ]
    },
    {
      "id": 18,
      "group": 4,
      "question": "¿Qué esquema de identidad y federación se utilizará para usuarios y conectores?",
      "suggestion": "Considerar Cloud Identity y SSO con Entra ID; precisar cuándo se requiere Workforce Identity Federation, según modo de conector y preservación de permisos de origen.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Cloud Identity + Entra ID SSO; WIF según conectores",
        "Federación corporativa existente reutilizada",
        "Diseño de identidades y conectores pendiente"
      ]
    },
    {
      "id": 19,
      "group": 4,
      "question": "¿Quién administrará los accesos a cada fuente y cómo se respetarán los permisos originales?",
      "suggestion": "Nombrar dueños técnicos y de datos de SharePoint, Drive, BigQuery y demás fuentes. Validar grupos, alcance de conectores, ACL y accesos de solo lectura con usuarios de prueba.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P0",
      "options": [
        "Responsables de fuentes designados y ACL probadas",
        "Responsables designados; permisos en trámite",
        "Pendiente de nombrar propietarios de fuentes"
      ]
    },
    {
      "id": 20,
      "group": 4,
      "question": "¿Qué mecanismos de integración estarán disponibles con proveedores y sistemas externos?",
      "suggestion": "Inventariar APIs, archivos y exportaciones por caso. La prueba de concepto no escribirá en sistemas core; para un sistema externo y agendamiento, Evaluar según las capacidades disponibles.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial–fase de diseño",
      "priority": "P0",
      "options": [
        "Archivos/exportaciones de solo lectura",
        "APIs de consulta de solo lectura",
        "Conectores nativos autorizados",
        "Combinación de archivos, APIs y conectores",
        "Aún no hay integración disponible"
      ]
    },
    {
      "id": 21,
      "group": 4,
      "question": "¿Qué datos utilizará cada solución, quién los entregará y qué autorizaciones se requieren?",
      "suggestion": "Cada prestadora entregará fuentes y muestras con estructura acordada. Privacidad validará datos sintéticos o anonimizados, clasificación, custodia y período de retención antes de la ingesta.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial–fase de diseño",
      "priority": "P0",
      "options": [
        "Datasets sintéticos aprobados por Privacidad",
        "Datasets anonimizados aprobados por Privacidad",
        "Fuentes en preparación; sin datos listos"
      ]
    },
    {
      "id": 22,
      "group": 5,
      "question": "¿Quiénes serán los responsables funcionales, técnicos y aprobadores de cada solución?",
      "suggestion": "Asignar por caso un dueño de negocio, contraparte de prestadora, dueño de datos y responsable de aceptación; incorporar validación médica en 0026 y 0029.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Responsables funcional, técnico y aprobador por cada prueba de concepto",
        "Responsables parciales; pendientes por prestadora",
        "Designación de responsables pendiente"
      ]
    },
    {
      "id": 23,
      "group": 5,
      "question": "¿Cómo se organizarán las sesiones de levantamiento y validación con los equipos involucrados?",
      "suggestion": "Organizar por caso sesiones de levantamiento funcional, datos/integraciones y aceptación; el equipo coordinador coordina convocatorias y cada reunión cierra con acuerdos, responsables y fecha.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de fase inicial",
      "priority": "P0",
      "options": [
        "Talleres separados por caso: funcional, técnico y aceptación",
        "Sesiones agrupadas por prestadora",
        "Sesiones agrupadas por ola de implementación",
        "Modelo mixto según disponibilidad y complejidad",
        "Calendario pendiente de coordinación"
      ]
    },
    {
      "id": 24,
      "group": 5,
      "question": "¿Qué indicadores, pruebas y evidencias se utilizarán para aceptar cada solución?",
      "suggestion": "Acordar KPI, línea base, preguntas de oro, muestras de evaluación, umbrales, pruebas negativas y responsables de firma. El diseño cierra en G2 y los resultados se validan en G3, con Go/No-Go por caso.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "Antes de aprobación del diseño",
      "priority": "P0",
      "options": [
        "KPI + línea base + preguntas de oro + umbrales antes de G2",
        "Criterios funcionales y técnicos en revisión para G2",
        "Criterios pendientes de dueños de caso"
      ]
    },
    {
      "id": 25,
      "group": 5,
      "question": "¿Qué mecanismo se utilizará para registrar acuerdos, cambios, bloqueos y responsables?",
      "suggestion": "Mantener registro único de decisiones, dependencias, acuerdos técnicos y cambios de alcance; revisar semanalmente con PM/CoE y escalar al sponsor las decisiones que afecten hitos.",
      "origin": "PROPUESTA ORIENTATIVA",
      "reference": "Plantilla de arquitectura · Adaptar según el proyecto",
      "due": "fase inicial",
      "priority": "P1",
      "options": [
        "Registro único de acuerdos, decisiones, bloqueos y cambios",
        "Actas por sesión + tablero central de seguimiento",
        "Proceso de registro por definir"
      ]
    }
  ]
};
