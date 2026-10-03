const $ = (id) => document.getElementById(id);

const state = {
    mode: "problem",
    task: "inventory",
    steps: []
};


/* =========================================================
   HELPERS
   ========================================================= */

function cliName() {
    return $("platform").value === "openshift"
        ? "oc"
        : "kubectl";
}


function shellQuote(value) {
    const text = String(value || "").trim();

    if (!text) {
        return "";
    }

    if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(text)) {
        return text;
    }

    return "'" + text.replace(/'/g, `'\\''`) + "'";
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function context() {
    return {
        cli: cliName(),
        namespace: $("namespace").value.trim(),
        pod: $("pod").value.trim(),
        container: $("container").value.trim(),
        node: $("node").value.trim(),
        service: $("service").value.trim(),
        host: $("host").value.trim(),
        port: $("port").value.trim()
    };
}


function namespaceFlag(ctx) {
    return ctx.namespace
        ? ` -n ${shellQuote(ctx.namespace)}`
        : "";
}


function containerFlag(ctx) {
    return ctx.container
        ? ` -c ${shellQuote(ctx.container)}`
        : "";
}


function shellTarget(ctx) {
    return `${shellQuote(ctx.pod)}${namespaceFlag(ctx)}${containerFlag(ctx)}`;
}


function urlFor(ctx) {
    const protocol = $("networkProtocol")
        ? $("networkProtocol").value
        : "https";

    return shellQuote(
        `${protocol}://${ctx.host}:${ctx.port}`
    );
}


function makeStep({
    title,
    description,
    command,
    check = "",
    note = "",
    tags = []
}) {
    return {
        title,
        description,
        command,
        check,
        note,
        tags
    };
}


function addStep(steps, options) {
    steps.push(makeStep(options));
}


function fieldLabel(field) {
    const labels = {
        namespace: "Namespace",
        pod: "Pod",
        container: "Container",
        node: "Node / Worker",
        service: "Service",
        host: "Host / destino",
        port: "Puerto",
        sshUser: "Usuario SSH",
        localPath: "Ruta local",
        remotePath: "Ruta remota",
        debugImage: "Imagen de diagnóstico"
    };

    return labels[field] || field;
}


function requiredFields(fields) {
    const ctx = context();

    return fields.filter(
        (field) => !String(ctx[field] || "").trim()
    );
}


function showValidation(fields, extras = []) {
    const box = $("validationMessage");

    const missing = [
        ...new Set(
            [...fields, ...extras]
                .filter(Boolean)
        )
    ];

    if (!missing.length) {
        box.classList.add("hidden");
        box.innerHTML = "";
        return true;
    }

    box.classList.remove("hidden");

    box.innerHTML =
        "<strong>Faltan datos para generar este runbook:</strong> " +
        missing.map(fieldLabel).join(", ");

    box.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    return false;
}


/* =========================================================
   MODOS
   ========================================================= */

function setMode(mode) {
    state.mode = mode;

    document.querySelectorAll(".mode-card")
        .forEach((card) => {
            card.classList.toggle(
                "active",
                card.dataset.mode === mode
            );
        });

    $("problemModeSection")
        .classList.toggle(
            "hidden",
            mode !== "problem"
        );

    $("taskModeSection")
        .classList.toggle(
            "hidden",
            mode !== "task"
        );

    updateDynamicContext();
}


function setTask(task) {
    state.task = task;

    document.querySelectorAll(".task-tab")
        .forEach((tab) => {
            tab.classList.toggle(
                "active",
                tab.dataset.task === task
            );
        });

    document.querySelectorAll("[data-task-panel]")
        .forEach((panel) => {
            panel.classList.toggle(
                "hidden",
                panel.dataset.taskPanel !== task
            );
        });

    updateTaskSubPanels();
    updateDynamicContext();
}


/* =========================================================
   CONTEXTO DINÁMICO
   ========================================================= */

const problemContextFields = {
    "app-not-responding": [
        "platform",
        "namespace",
        "pod",
        "container",
        "service"
    ],

    crashloop: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    restarting: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    pending: [
        "platform",
        "namespace",
        "pod"
    ],

    imagepull: [
        "platform",
        "namespace",
        "pod"
    ],

    dns: [
        "platform",
        "namespace",
        "pod",
        "container",
        "host"
    ],

    connectivity: [
        "platform",
        "namespace",
        "pod",
        "container",
        "host",
        "port",
        "service"
    ],

    cpu: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    memory: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    storage: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    config: [
        "platform",
        "namespace",
        "pod",
        "container"
    ],

    "node-notready": [
        "platform",
        "node"
    ]
};


function taskContextFields() {
    const fields = new Set(["platform"]);

    if (state.task === "inventory") {
        if ($("inventoryScope").value === "namespace") {
            fields.add("namespace");
        }
    }

    if (state.task === "pod") {
        fields.add("namespace");
        fields.add("pod");
        fields.add("container");
    }

    if (state.task === "access") {
        const mode = $("accessMode").value;

        if (mode === "node-debug") {
            fields.add("node");
        } else {
            fields.add("namespace");
            fields.add("pod");
            fields.add("container");
        }
    }

    if (state.task === "network") {
        fields.add("namespace");
        fields.add("host");
        fields.add("port");
        fields.add("service");

        if ($("networkExecution").value === "pod") {
            fields.add("pod");
            fields.add("container");
        }

        if ($("netPodIp").checked) {
            fields.add("pod");
        }
    }

    if (state.task === "files") {
        const direction = $("copyDirection").value;

        if (
            direction === "to-pod" ||
            direction === "from-pod"
        ) {
            fields.add("namespace");
            fields.add("pod");
            fields.add("container");
        } else {
            fields.add("node");
        }
    }

    if (state.task === "resources") {
        if (
            $("resPodUsage").checked ||
            $("resRequestsLimits").checked ||
            $("resRestartCount").checked
        ) {
            fields.add("namespace");
            fields.add("pod");
        }

        if ($("resNodePressure").checked) {
            fields.add("node");
        }
    }

    return [...fields];
}


function currentContextFields() {
    if (state.mode === "problem") {
        return problemContextFields[
            $("problemType").value
        ] || ["platform"];
    }

    return taskContextFields();
}


function updateDynamicContext() {
    const showAll = $("showAllContext").checked;

    const fields = new Set(
        currentContextFields()
    );

    document.querySelectorAll(".context-field")
        .forEach((element) => {
            const field = element.dataset.field;

            element.classList.toggle(
                "context-field-hidden",
                !showAll && !fields.has(field)
            );
        });

    const visibleNames = [...fields]
        .filter((name) => name !== "platform")
        .map(fieldLabel);

    $("contextHelp").textContent =
        visibleNames.length
            ? `Para este flujo necesitas: ${visibleNames.join(", ")}.`
            : "Este flujo no necesita datos específicos de un Pod o Node.";

    updateContextNote();
}


function updateContextNote() {
    const ctx = context();

    const platform =
        $("platform").value === "openshift"
            ? "OpenShift (oc)"
            : "Kubernetes (kubectl)";

    const parts = [
        `<strong>Contexto activo:</strong> ${platform}`
    ];

    if (ctx.namespace) {
        parts.push(
            `namespace <code>${escapeHtml(ctx.namespace)}</code>`
        );
    }

    if (ctx.pod) {
        parts.push(
            `pod <code>${escapeHtml(ctx.pod)}</code>`
        );
    }

    if (ctx.container) {
        parts.push(
            `container <code>${escapeHtml(ctx.container)}</code>`
        );
    }

    if (ctx.node) {
        parts.push(
            `node <code>${escapeHtml(ctx.node)}</code>`
        );
    }

    $("contextNote").innerHTML =
        parts.join(" · ");
}


function clearContext() {
    $("namespace").value = "default";
    $("pod").value = "";
    $("container").value = "";
    $("node").value = "";
    $("service").value = "";
    $("host").value = "";
    $("port").value = "443";

    updateDynamicContext();
}


/* =========================================================
   SUBPANELES DINÁMICOS
   ========================================================= */

function updateTaskSubPanels() {
    if (state.task === "access") {
        const mode = $("accessMode").value;

        $("insideCommandGroup").classList.toggle(
            "hidden",
            mode !== "command"
        );

        $("debugImageGroup").classList.toggle(
            "hidden",
            !["ephemeral", "node-debug"]
                .includes(mode)
        );
    }

    if (state.task === "files") {
        const direction = $("copyDirection").value;

        $("sshUserGroup").classList.toggle(
            "hidden",
            !["to-node", "from-node"]
                .includes(direction)
        );
    }
}


/* =========================================================
   RUNBOOK: PROBLEMAS
   ========================================================= */

function generateProblemRunbook() {
    const ctx = context();

    const problem = $("problemType").value;

    const depth = $("problemDepth").value;

    const depthValue = {
        basic: 1,
        standard: 2,
        deep: 3
    }[depth];

    const requiredMap = {
        "app-not-responding": [
            "namespace",
            "pod"
        ],

        crashloop: [
            "namespace",
            "pod"
        ],

        restarting: [
            "namespace",
            "pod"
        ],

        pending: [
            "namespace",
            "pod"
        ],

        imagepull: [
            "namespace",
            "pod"
        ],

        dns: [
            "namespace",
            "pod",
            "host"
        ],

        connectivity: [
            "namespace",
            "pod",
            "host",
            "port"
        ],

        cpu: [
            "namespace",
            "pod"
        ],

        memory: [
            "namespace",
            "pod"
        ],

        storage: [
            "namespace",
            "pod"
        ],

        config: [
            "namespace",
            "pod"
        ],

        "node-notready": [
            "node"
        ]
    };

    const missing = requiredFields(
        requiredMap[problem] || []
    );

    if (!showValidation(missing)) {
        return;
    }

    const k = ctx.cli;
    const n = namespaceFlag(ctx);
    const c = containerFlag(ctx);
    const pod = shellQuote(ctx.pod);

    const steps = [];

    function push(minDepth, options) {
        if (depthValue >= minDepth) {
            addStep(steps, options);
        }
    }


    if (problem === "app-not-responding") {

        push(1, {
            title: "Estado del Pod",
            description:
                "Confirma estado, IP, node y readiness.",
            command:
                `${k} get pod ${pod}${n} -o wide`,
            check:
                "Revisa STATUS, READY, RESTARTS, IP y NODE.",
            tags: ["Pod"]
        });

        push(1, {
            title: "Describe del Pod",
            description:
                "Revisa eventos, probes, mounts y estado de containers.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Busca fallos de Readiness/Liveness, MountVolume, eventos o contenedores no listos.",
            tags: ["Pod", "Events"]
        });

        push(1, {
            title: "Logs de aplicación",
            description:
                "Obtiene los logs actuales del contenedor.",
            command:
                `${k} logs ${pod}${n}${c} --tail=200 --timestamps`,
            check:
                "Busca errores de inicialización, conexión, timeout, excepciones o fallos de dependencias.",
            tags: ["Logs"]
        });

        push(2, {
            title: "Eventos del Namespace",
            description:
                "Ordena los eventos para identificar cambios recientes.",
            command:
                `${k} get events${n} --sort-by=.metadata.creationTimestamp`,
            check:
                "Correlaciona la hora del incidente con warnings, restarts, mounts o scheduling.",
            tags: ["Events"]
        });

        if (ctx.service) {
            push(2, {
                title: "Service",
                description:
                    "Verifica puertos, selector y ClusterIP.",
                command:
                    `${k} get svc ${shellQuote(ctx.service)}${n} -o wide`,
                check:
                    "Confirma que selector y puertos correspondan a la aplicación.",
                tags: ["Network"]
            });

            push(2, {
                title: "EndpointSlices",
                description:
                    "Comprueba si el Service tiene endpoints listos.",
                command:
                    `${k} get endpointslices${n} -l kubernetes.io/service-name=${shellQuote(ctx.service)}`,
                check:
                    "Si no aparecen direcciones, revisa selector del Service y readiness de los Pods.",
                tags: ["Network"]
            });
        }

        push(3, {
            title: "Configuración efectiva",
            description:
                "Obtiene el YAML actual del Pod.",
            command:
                `${k} get pod ${pod}${n} -o yaml`,
            check:
                "Compara imagen, env, volumes, probes, requests/limits y serviceAccount.",
            tags: ["Config"]
        });
    }


    if (problem === "crashloop") {

        push(1, {
            title: "Estado y reinicios",
            description:
                "Confirma CrashLoopBackOff y número de reinicios.",
            command:
                `${k} get pod ${pod}${n} -o wide`,
            check:
                "Revisa STATUS y RESTARTS.",
            tags: ["Pod"]
        });

        push(1, {
            title: "Logs de ejecución anterior",
            description:
                "Muestra los logs del contenedor antes del último reinicio.",
            command:
                `${k} logs ${pod}${n}${c} --previous --tail=200 --timestamps`,
            check:
                "Busca el error inmediatamente anterior al restart.",
            tags: ["Logs", "Clave"]
        });

        push(1, {
            title: "Describe del Pod",
            description:
                "Busca razones de terminación, probes y eventos.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Revisa Last State, Exit Code, Reason, OOMKilled y probes.",
            tags: ["Pod", "Events"]
        });

        push(2, {
            title: "Restart count",
            description:
                "Obtiene reinicios por cada container.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .status.containerStatuses[*]}{.name}{" restartCount="}{.restartCount}{" reason="}{.lastState.terminated.reason}{"\\n"}{end}'`,
            check:
                "Identifica qué container está reiniciando.",
            tags: ["Pod"]
        });

        push(2, {
            title: "Logs actuales",
            description:
                "Revisa la ejecución actual.",
            command:
                `${k} logs ${pod}${n}${c} --tail=200 --timestamps`,
            check:
                "Compara con --previous para ver si el patrón se repite.",
            tags: ["Logs"]
        });

        push(3, {
            title: "Requests / Limits",
            description:
                "Revisa límites que podrían causar OOM o throttling.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.resources}{"\\n"}{end}'`,
            check:
                "Compara limits con el consumo observado.",
            tags: ["Resources"]
        });
    }


    if (problem === "restarting") {

        push(1, {
            title: "Restart count",
            description:
                "Obtiene reinicios y última razón de terminación.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .status.containerStatuses[*]}{.name}{" restartCount="}{.restartCount}{" reason="}{.lastState.terminated.reason}{"\\n"}{end}'`,
            check:
                "Busca crecimiento continuo del contador.",
            tags: ["Pod"]
        });

        push(1, {
            title: "Logs anteriores",
            description:
                "Revisa la ejecución previa.",
            command:
                `${k} logs ${pod}${n}${c} --previous --tail=200 --timestamps`,
            check:
                "Busca errores justo antes del reinicio.",
            tags: ["Logs"]
        });

        push(2, {
            title: "Describe",
            description:
                "Valida probes, OOMKilled y eventos.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Revisa Last State, Exit Code y eventos.",
            tags: ["Pod"]
        });

        push(3, {
            title: "Recursos",
            description:
                "Compara consumo y límites.",
            command:
                `${k} top pod ${pod}${n} --containers`,
            check:
                "Si falla, metrics-server puede no estar disponible.",
            note:
                "kubectl top requiere Metrics API/metrics-server.",
            tags: ["Resources"]
        });
    }


    if (problem === "pending") {

        push(1, {
            title: "Estado del Pod",
            description:
                "Confirma que continúe Pending.",
            command:
                `${k} get pod ${pod}${n} -o wide`,
            check:
                "Revisa si NODE está vacío.",
            tags: ["Pod"]
        });

        push(1, {
            title: "Describe del Pod",
            description:
                "Busca FailedScheduling, PVC, affinity o taints.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "La sección Events suele indicar la causa exacta.",
            tags: ["Scheduler", "Events"]
        });

        push(2, {
            title: "Estado de Nodes",
            description:
                "Comprueba disponibilidad de workers.",
            command:
                `${k} get nodes -o wide`,
            check:
                "Busca nodes NotReady o sin capacidad.",
            tags: ["Node"]
        });

        push(2, {
            title: "PVC del Namespace",
            description:
                "Busca claims Pending.",
            command:
                `${k} get pvc${n}`,
            check:
                "Un PVC Pending puede impedir el scheduling.",
            tags: ["Storage"]
        });

        push(3, {
            title: "Eventos del Namespace",
            description:
                "Ordena todos los eventos.",
            command:
                `${k} get events${n} --sort-by=.metadata.creationTimestamp`,
            check:
                "Busca FailedScheduling, FailedMount o provisioning.",
            tags: ["Events"]
        });
    }


    if (problem === "imagepull") {

        push(1, {
            title: "Describe del Pod",
            description:
                "Busca el error exacto de pull.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Revisa registry, tag, manifest, TLS y autenticación.",
            tags: ["Image", "Events"]
        });

        push(1, {
            title: "Imágenes configuradas",
            description:
                "Lista la imagen de cada container.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.image}{"\\n"}{end}'`,
            check:
                "Confirma registry, repositorio y tag.",
            tags: ["Image"]
        });

        push(2, {
            title: "ImagePullSecrets",
            description:
                "Lista únicamente referencias de secrets.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{.spec.imagePullSecrets[*].name}'`,
            check:
                "Confirma que el secret exista en el mismo namespace.",
            note:
                "No se muestran valores del Secret.",
            tags: ["Security"]
        });

        push(3, {
            title: "ServiceAccount",
            description:
                "Revisa ServiceAccount asociado.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{.spec.serviceAccountName}'`,
            check:
                "ImagePullSecrets también pueden estar asociados al ServiceAccount.",
            tags: ["Security"]
        });
    }


    if (problem === "dns") {

        push(1, {
            title: "Resolución con getent",
            description:
                "Prueba DNS desde el contenedor.",
            command:
                `${k} exec ${shellTarget(ctx)} -- getent hosts ${shellQuote(ctx.host)}`,
            check:
                "Debe devolver una dirección IP.",
            tags: ["DNS"]
        });

        push(1, {
            title: "resolv.conf",
            description:
                "Revisa configuración DNS dentro del Pod.",
            command:
                `${k} exec ${shellTarget(ctx)} -- cat /etc/resolv.conf`,
            check:
                "Revisa nameserver, search domains y ndots.",
            tags: ["DNS"]
        });

        push(2, {
            title: "nslookup",
            description:
                "Prueba alternativa si la imagen incluye nslookup.",
            command:
                `${k} exec ${shellTarget(ctx)} -- nslookup ${shellQuote(ctx.host)}`,
            check:
                "Si el binario no existe, usa la alternativa de Pod temporal.",
            tags: ["DNS", "Alternative"]
        });

        push(2, {
            title: "CoreDNS",
            description:
                "Comprueba estado de los Pods DNS.",
            command:
                `${k} get pods -n kube-system -l k8s-app=kube-dns -o wide`,
            check:
                "Todos deberían estar Running/Ready.",
            tags: ["DNS", "Cluster"]
        });

        push(3, {
            title: "Pod temporal de diagnóstico",
            description:
                "Ejecuta dig desde una imagen con herramientas de red.",
            command:
                `${k} run netshoot-dns${n} --rm -it --restart=Never --image=nicolaka/netshoot -- dig ${shellQuote(ctx.host)}`,
            check:
                "Si funciona desde netshoot pero no desde la aplicación, revisa la imagen o configuración del contenedor.",
            note:
                "Requiere permiso para crear Pods y acceso al registry de la imagen.",
            tags: ["DNS", "Debug"]
        });
    }


    if (problem === "connectivity") {

        push(1, {
            title: "Resolver destino",
            description:
                "Primero confirma DNS.",
            command:
                `${k} exec ${shellTarget(ctx)} -- getent hosts ${shellQuote(ctx.host)}`,
            check:
                "Si no resuelve, continúa por el flujo de DNS.",
            tags: ["DNS"]
        });

        push(1, {
            title: "Prueba TCP",
            description:
                "Comprueba apertura del puerto.",
            command:
                `${k} exec ${shellTarget(ctx)} -- nc -vz ${shellQuote(ctx.host)} ${shellQuote(ctx.port)}`,
            check:
                "Connection refused indica respuesta del host pero puerto cerrado/rechazado; timeout suele apuntar a ruta/firewall/policy.",
            tags: ["TCP"]
        });

        push(1, {
            title: "Prueba HTTP/HTTPS",
            description:
                "Valida conexión, respuesta y TLS.",
            command:
                `${k} exec ${shellTarget(ctx)} -- curl -vk ${urlFor(ctx)}`,
            check:
                "Revisa DNS, conexión TCP, handshake TLS y código HTTP.",
            tags: ["HTTP"]
        });

        if (ctx.service) {
            push(2, {
                title: "Service",
                description:
                    "Valida definición del Service.",
                command:
                    `${k} get svc ${shellQuote(ctx.service)}${n} -o wide`,
                check:
                    "Revisa selector, port y targetPort.",
                tags: ["Service"]
            });

            push(2, {
                title: "EndpointSlices",
                description:
                    "Comprueba backends del Service.",
                command:
                    `${k} get endpointslices${n} -l kubernetes.io/service-name=${shellQuote(ctx.service)}`,
                check:
                    "Sin endpoints, revisa selector y readiness.",
                tags: ["Service"]
            });
        }

        push(3, {
            title: "NetworkPolicies",
            description:
                "Lista políticas que podrían bloquear el tráfico.",
            command:
                `${k} get networkpolicy${n}`,
            check:
                "Revisa ingress/egress aplicables al Pod.",
            tags: ["NetworkPolicy"]
        });
    }


    if (problem === "cpu") {

        push(1, {
            title: "Consumo del Pod",
            description:
                "Muestra CPU y memoria por container.",
            command:
                `${k} top pod ${pod}${n} --containers`,
            check:
                "Identifica el container que concentra el consumo.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources"]
        });

        push(1, {
            title: "Requests / Limits",
            description:
                "Revisa recursos declarados.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.resources}{"\\n"}{end}'`,
            check:
                "Compara consumo con requests y limits.",
            tags: ["Resources"]
        });

        push(2, {
            title: "Procesos",
            description:
                "Lista procesos dentro del contenedor.",
            command:
                `${k} exec ${shellTarget(ctx)} -- ps -ef`,
            check:
                "Útil para identificar procesos inesperados.",
            tags: ["Container"]
        });

        push(3, {
            title: "Top Nodes",
            description:
                "Compara carga de workers.",
            command:
                `${k} top nodes`,
            check:
                "Busca presión general del node donde corre el Pod.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Node", "Resources"]
        });
    }


    if (problem === "memory") {

        push(1, {
            title: "Uso del Pod",
            description:
                "Muestra memoria por container.",
            command:
                `${k} top pod ${pod}${n} --containers`,
            check:
                "Compara memoria con limits.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources"]
        });

        push(1, {
            title: "Última terminación",
            description:
                "Busca OOMKilled y exit codes.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .status.containerStatuses[*]}{.name}{" reason="}{.lastState.terminated.reason}{" exitCode="}{.lastState.terminated.exitCode}{"\\n"}{end}'`,
            check:
                "OOMKilled normalmente indica que el container superó su límite de memoria.",
            tags: ["Memory"]
        });

        push(2, {
            title: "Requests / Limits",
            description:
                "Obtiene recursos declarados.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.resources}{"\\n"}{end}'`,
            check:
                "Revisa especialmente limits.memory.",
            tags: ["Resources"]
        });

        push(3, {
            title: "Describe",
            description:
                "Corrobora eventos y estados.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Busca OOMKilled, restarts y condiciones.",
            tags: ["Pod"]
        });
    }


    if (problem === "storage") {

        push(1, {
            title: "Describe del Pod",
            description:
                "Busca mounts y errores de volumen.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Busca FailedMount, FailedAttachVolume y PVC.",
            tags: ["Storage"]
        });

        push(1, {
            title: "PVC",
            description:
                "Lista claims del Namespace.",
            command:
                `${k} get pvc${n}`,
            check:
                "Todos los PVC requeridos deberían estar Bound.",
            tags: ["Storage"]
        });

        push(2, {
            title: "Persistent Volumes",
            description:
                "Lista PV del clúster.",
            command:
                `${k} get pv`,
            check:
                "Revisa STATUS, CLAIM y STORAGECLASS.",
            tags: ["Storage"]
        });

        push(2, {
            title: "Filesystem del Container",
            description:
                "Muestra mounts y espacio disponible.",
            command:
                `${k} exec ${shellTarget(ctx)} -- df -h`,
            check:
                "Busca filesystems llenos o mounts faltantes.",
            tags: ["Filesystem"]
        });

        push(3, {
            title: "StorageClasses",
            description:
                "Revisa provisionadores.",
            command:
                `${k} get storageclass`,
            check:
                "Confirma StorageClass y provisioner esperado.",
            tags: ["Storage"]
        });
    }


    if (problem === "config") {

        push(1, {
            title: "YAML efectivo del Pod",
            description:
                "Obtiene configuración actual.",
            command:
                `${k} get pod ${pod}${n} -o yaml`,
            check:
                "Revisa image, env, volumes, probes, resources y serviceAccount.",
            tags: ["Config"]
        });

        push(1, {
            title: "Variables de entorno",
            description:
                "Lista variables dentro del contenedor.",
            command:
                `${k} exec ${shellTarget(ctx)} -- env | sort`,
            check:
                "Compara valores esperados sin copiar secretos a evidencias.",
            tags: ["Config"]
        });

        push(2, {
            title: "ConfigMaps",
            description:
                "Lista ConfigMaps del Namespace.",
            command:
                `${k} get configmap${n}`,
            check:
                "Identifica ConfigMaps referenciados por la aplicación.",
            tags: ["ConfigMap"]
        });

        push(2, {
            title: "Referencias a Secrets",
            description:
                "Lista nombres de Secret referenciados, sin revelar valores.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*].envFrom[*]}{.secretRef.name}{"\\n"}{end}'`,
            check:
                "Confirma que los objetos existan en el mismo Namespace.",
            note:
                "La herramienta evita generar comandos que impriman valores de Secrets.",
            tags: ["Security"]
        });

        push(3, {
            title: "Volumes",
            description:
                "Obtiene definición de volúmenes.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{.spec.volumes}'`,
            check:
                "Revisa ConfigMaps, Secrets, PVC y projected volumes.",
            tags: ["Storage", "Config"]
        });
    }


    if (problem === "node-notready") {

        const node = shellQuote(ctx.node);

        push(1, {
            title: "Estado del Node",
            description:
                "Confirma condición Ready y versión.",
            command:
                `${k} get node ${node} -o wide`,
            check:
                "Revisa STATUS, versión y runtime.",
            tags: ["Node"]
        });

        push(1, {
            title: "Describe del Node",
            description:
                "Revisa Conditions, taints, capacidad y eventos.",
            command:
                `${k} describe node ${node}`,
            check:
                "Busca MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable y eventos del kubelet.",
            tags: ["Node", "Events"]
        });

        push(2, {
            title: "Condiciones del Node",
            description:
                "Resume condiciones principales.",
            command:
                `${k} get node ${node} -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{"\\n"}{end}'`,
            check:
                "Ready=False/Unknown requiere revisar razón y mensaje.",
            tags: ["Node"]
        });

        push(2, {
            title: "Pods en el Node",
            description:
                "Lista workloads alojados en el worker.",
            command:
                `${k} get pods -A -o wide --field-selector spec.nodeName=${node}`,
            check:
                "Evalúa impacto y pods afectados.",
            tags: ["Node", "Pods"]
        });

        push(3, {
            title: "Debug del Node",
            description:
                "Abre un Pod privilegiado de diagnóstico.",
            command:
                `${k} debug node/${node} -it --image=nicolaka/netshoot`,
            check:
                "El filesystem del host suele quedar disponible bajo /host.",
            note:
                "Requiere permisos elevados. Revisa políticas del clúster antes de usarlo.",
            tags: ["Debug", "Warning"]
        });
    }


    return steps;
}


/* =========================================================
   RUNBOOK: TAREAS
   ========================================================= */

function inventoryScopeFlag(ctx) {
    return $("inventoryScope").value === "namespace"
        ? namespaceFlag(ctx)
        : " -A";
}


function inventoryOutputSuffix() {
    const format = $("inventoryFormat").value;

    if (format === "wide") {
        return " -o wide";
    }

    if (format === "labels") {
        return " --show-labels";
    }

    return "";
}


function generateInventoryRunbook() {
    const ctx = context();

    const steps = [];

    const k = ctx.cli;

    const scope = inventoryScopeFlag(ctx);

    const output = inventoryOutputSuffix();

    if (
        $("inventoryScope").value === "namespace" &&
        !ctx.namespace
    ) {
        showValidation(["namespace"]);
        return null;
    }

    if ($("invNamespaces").checked) {
        addStep(steps, {
            title: "Namespaces",
            description:
                "Lista namespaces del clúster.",
            command:
                `${k} get namespaces${output}`,
            check:
                "Útil para ubicar workloads y separar alcance.",
            tags: ["Inventory"]
        });
    }

    if ($("invNodes").checked) {
        addStep(steps, {
            title: "Nodes / Workers",
            description:
                "Inventario de nodes con IP, SO y runtime.",
            command:
                `${k} get nodes${output || " -o wide"}`,
            check:
                "Revisa STATUS, VERSION, INTERNAL-IP y CONTAINER-RUNTIME.",
            tags: ["Inventory", "Node"]
        });
    }

    if ($("invPods").checked) {
        addStep(steps, {
            title: "Pods",
            description:
                "Inventario de Pods.",
            command:
                `${k} get pods${scope}${output}`,
            check:
                "Revisa READY, STATUS, RESTARTS y NODE.",
            tags: ["Inventory", "Pod"]
        });
    }

    if ($("invDeployments").checked) {
        addStep(steps, {
            title: "Deployments",
            description:
                "Inventario de Deployments.",
            command:
                `${k} get deployments${scope}${output}`,
            check:
                "Revisa READY, UP-TO-DATE y AVAILABLE.",
            tags: ["Inventory"]
        });
    }

    if ($("invStatefulSets").checked) {
        addStep(steps, {
            title: "StatefulSets",
            description:
                "Inventario de StatefulSets.",
            command:
                `${k} get statefulsets${scope}${output}`,
            check:
                "Revisa READY y réplicas.",
            tags: ["Inventory"]
        });
    }

    if ($("invDaemonSets").checked) {
        addStep(steps, {
            title: "DaemonSets",
            description:
                "Inventario de DaemonSets.",
            command:
                `${k} get daemonsets${scope}${output}`,
            check:
                "Revisa DESIRED, READY y AVAILABLE.",
            tags: ["Inventory"]
        });
    }

    if ($("invServices").checked) {
        addStep(steps, {
            title: "Services",
            description:
                "Inventario de Services.",
            command:
                `${k} get svc${scope}${output}`,
            check:
                "Revisa TYPE, CLUSTER-IP, EXTERNAL-IP y PORTS.",
            tags: ["Inventory", "Network"]
        });
    }

    if ($("invIngress").checked) {
        addStep(steps, {
            title: "Ingress",
            description:
                "Inventario de recursos Ingress.",
            command:
                `${k} get ingress${scope}${output}`,
            check:
                "Revisa hosts, addresses y puertos.",
            tags: ["Inventory", "Network"]
        });
    }

    if ($("invConfigMaps").checked) {
        addStep(steps, {
            title: "ConfigMaps",
            description:
                "Lista ConfigMaps sin imprimir su contenido.",
            command:
                `${k} get configmap${scope}`,
            check:
                "Útil para identificar objetos de configuración existentes.",
            tags: ["Inventory", "Config"]
        });
    }

    if ($("invStorage").checked) {
        addStep(steps, {
            title: "Persistent Volumes",
            description:
                "Lista PV del clúster.",
            command:
                `${k} get pv`,
            check:
                "Revisa STATUS, CLAIM, CAPACITY y STORAGECLASS.",
            tags: ["Inventory", "Storage"]
        });

        addStep(steps, {
            title: "Persistent Volume Claims",
            description:
                "Lista PVC según el alcance.",
            command:
                `${k} get pvc${scope}`,
            check:
                "Revisa STATUS y volumen enlazado.",
            tags: ["Inventory", "Storage"]
        });

        addStep(steps, {
            title: "StorageClasses",
            description:
                "Lista clases de almacenamiento.",
            command:
                `${k} get storageclass`,
            check:
                "Revisa provisioner y política de reclaim.",
            tags: ["Inventory", "Storage"]
        });
    }

    if ($("invNetworkPolicies").checked) {
        addStep(steps, {
            title: "NetworkPolicies",
            description:
                "Lista políticas de red.",
            command:
                `${k} get networkpolicy${scope}`,
            check:
                "Útil para revisar restricciones ingress/egress.",
            tags: ["Inventory", "Network"]
        });
    }

    if ($("invEvents").checked) {
        addStep(steps, {
            title: "Events",
            description:
                "Eventos ordenados cronológicamente.",
            command:
                `${k} get events${scope} --sort-by=.metadata.creationTimestamp`,
            check:
                "Prioriza Warning y eventos cercanos al incidente.",
            tags: ["Inventory", "Events"]
        });
    }

    return steps;
}


function podLogCommand(ctx, previous = false) {
    let command =
        `${ctx.cli} logs ${shellQuote(ctx.pod)}` +
        `${namespaceFlag(ctx)}` +
        `${containerFlag(ctx)}`;

    const tail = $("logTail").value.trim();

    const since = $("logSince").value;

    if (previous) {
        command += " --previous";
    }

    if (tail) {
        command += ` --tail=${shellQuote(tail)}`;
    }

    if (since) {
        command += ` --since=${shellQuote(since)}`;
    }

    command += " --timestamps";

    return command;
}


function generatePodTaskRunbook() {
    const ctx = context();

    if (
        !showValidation(
            requiredFields(["namespace", "pod"])
        )
    ) {
        return null;
    }

    const steps = [];

    const k = ctx.cli;

    const pod = shellQuote(ctx.pod);

    const n = namespaceFlag(ctx);

    if ($("podStatus").checked) {
        addStep(steps, {
            title: "Estado del Pod",
            description:
                "Estado, IP y Node.",
            command:
                `${k} get pod ${pod}${n} -o wide`,
            check:
                "Revisa READY, STATUS, RESTARTS, IP y NODE.",
            tags: ["Pod"]
        });
    }

    if ($("podDescribe").checked) {
        addStep(steps, {
            title: "Describe",
            description:
                "Detalle del Pod y eventos asociados.",
            command:
                `${k} describe pod ${pod}${n}`,
            check:
                "Revisa Conditions, Containers y Events.",
            tags: ["Pod", "Events"]
        });
    }

    if ($("podLogs").checked) {
        addStep(steps, {
            title: "Logs",
            description:
                "Logs actuales con filtros seleccionados.",
            command:
                podLogCommand(ctx, false),
            check:
                "Correlaciona timestamps con el incidente.",
            tags: ["Logs"]
        });
    }

    if ($("podPreviousLogs").checked) {
        addStep(steps, {
            title: "Logs anteriores",
            description:
                "Logs de la ejecución anterior.",
            command:
                podLogCommand(ctx, true),
            check:
                "Útil cuando hubo restart o CrashLoopBackOff.",
            tags: ["Logs"]
        });
    }

    if ($("podEvents").checked) {
        addStep(steps, {
            title: "Events",
            description:
                "Eventos del Namespace.",
            command:
                `${k} get events${n} --sort-by=.metadata.creationTimestamp`,
            check:
                "Busca warnings relacionados con el Pod.",
            tags: ["Events"]
        });
    }

    if ($("podYaml").checked) {
        addStep(steps, {
            title: "YAML",
            description:
                "Configuración efectiva completa.",
            command:
                `${k} get pod ${pod}${n} -o yaml`,
            check:
                "Revisa spec y status.",
            tags: ["Config"]
        });
    }

    if ($("podResources").checked) {
        addStep(steps, {
            title: "Requests / Limits",
            description:
                "Recursos declarados por container.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.resources}{"\\n"}{end}'`,
            check:
                "Compara con consumo actual.",
            tags: ["Resources"]
        });
    }

    if ($("podRestartCount").checked) {
        addStep(steps, {
            title: "Restart count",
            description:
                "Reinicios por container.",
            command:
                `${k} get pod ${pod}${n} -o jsonpath='{range .status.containerStatuses[*]}{.name}{"="}{.restartCount}{"\\n"}{end}'`,
            check:
                "Identifica containers con reinicios.",
            tags: ["Pod"]
        });
    }

    return steps;
}


function generateAccessRunbook() {
    const ctx = context();

    const mode = $("accessMode").value;

    const image = $("debugImage").value.trim();

    const steps = [];

    if (mode === "node-debug") {
        if (
            !showValidation(
                requiredFields(["node"]),
                image ? [] : ["debugImage"]
            )
        ) {
            return null;
        }

        addStep(steps, {
            title: "Debug del Node",
            description:
                "Crea un Pod de diagnóstico sobre el Node.",
            command:
                `${ctx.cli} debug node/${shellQuote(ctx.node)} -it --image=${shellQuote(image)}`,
            check:
                "El filesystem del host normalmente queda montado en /host.",
            note:
                "Requiere privilegios adecuados. Revisa las políticas de seguridad del clúster.",
            tags: ["Debug", "Warning"]
        });

        return steps;
    }

    if (
        !showValidation(
            requiredFields(["namespace", "pod"]),
            mode === "ephemeral" && !image
                ? ["debugImage"]
                : []
        )
    ) {
        return null;
    }

    const target = shellTarget(ctx);

    if (mode === "shell") {
        addStep(steps, {
            title: "Abrir shell",
            description:
                "Acceso interactivo al contenedor.",
            command:
                `${ctx.cli} exec -it ${target} -- ${$("accessShell").value}`,
            check:
                "Si /bin/bash no existe, prueba /bin/sh.",
            tags: ["Exec"]
        });
    }

    if (mode === "command") {
        const command =
            $("insideCommand").value.trim();

        if (!command) {
            showValidation([], ["Comando"]);
            return null;
        }

        addStep(steps, {
            title: "Ejecutar comando",
            description:
                "Ejecuta una validación puntual.",
            command:
                `${ctx.cli} exec ${target} -- ${command}`,
            check:
                "Revisa salida y código de error del comando.",
            tags: ["Exec"]
        });
    }

    if (mode === "ephemeral") {
        let command =
            `${ctx.cli} debug -it pod/${shellQuote(ctx.pod)}` +
            `${namespaceFlag(ctx)}` +
            ` --image=${shellQuote(image)}`;

        if (ctx.container) {
            command +=
                ` --target=${shellQuote(ctx.container)}`;
        }

        addStep(steps, {
            title: "Ephemeral debug container",
            description:
                "Adjunta temporalmente una imagen con herramientas de diagnóstico.",
            command,
            check:
                "Útil para imágenes distroless o containers sin curl, ps, ss o shell.",
            note:
                "Requiere soporte de ephemeral containers y permisos RBAC adecuados.",
            tags: ["Debug", "Warning"]
        });
    }

    const checks = [
        [
            "checkProcesses",
            "Procesos",
            "ps -ef",
            "Lista procesos del contenedor."
        ],

        [
            "checkPorts",
            "Puertos",
            "ss -lntp",
            "Lista sockets en escucha."
        ],

        [
            "checkDns",
            "DNS",
            "cat /etc/resolv.conf",
            "Revisa nameserver y search domains."
        ],

        [
            "checkFilesystem",
            "Filesystem",
            "df -h",
            "Revisa espacio y mounts."
        ],

        [
            "checkEnv",
            "Variables",
            "env | sort",
            "Lista variables de entorno."
        ]
    ];

    checks.forEach(
        ([id, title, command, check]) => {
            if ($(id).checked) {
                addStep(steps, {
                    title,
                    description:
                        "Validación dentro del contenedor.",
                    command:
                        `${ctx.cli} exec ${target} -- ${command}`,
                    check,
                    tags: ["Container"]
                });
            }
        }
    );

    if (
        $("checkHttp").checked &&
        ctx.host &&
        ctx.port
    ) {
        addStep(steps, {
            title: "Prueba HTTP",
            description:
                "Valida conectividad desde el contenedor.",
            command:
                `${ctx.cli} exec ${target} -- curl -vk ${urlFor(ctx)}`,
            check:
                "Revisa DNS, TCP, TLS y código HTTP.",
            tags: ["Network"]
        });
    }

    return steps;
}


function toolboxPrefix(ctx, name) {
    return (
        `${ctx.cli} run ${name}` +
        `${namespaceFlag(ctx)}` +
        " --rm -it --restart=Never" +
        " --image=nicolaka/netshoot -- "
    );
}


function generateNetworkRunbook() {
    const ctx = context();

    const execution =
        $("networkExecution").value;

    const needsHost =
        $("netDns").checked ||
        $("netTcp").checked ||
        $("netHttp").checked;

    const needsPort =
        $("netTcp").checked ||
        $("netHttp").checked;

    const extras = [];

    if (needsHost && !ctx.host) {
        extras.push("host");
    }

    if (needsPort && !ctx.port) {
        extras.push("port");
    }

    if (
        ($("netService").checked ||
         $("netEndpoints").checked) &&
        !ctx.service
    ) {
        extras.push("service");
    }

    const required =
        execution === "pod"
            ? ["namespace", "pod"]
            : ["namespace"];

    if (
        !showValidation(
            requiredFields(required),
            extras
        )
    ) {
        return null;
    }

    const steps = [];

    const execPrefix =
        execution === "pod"
            ? `${ctx.cli} exec ${shellTarget(ctx)} -- `
            : null;

    function networkCommand(
        command,
        toolboxName
    ) {
        return execution === "pod"
            ? execPrefix + command
            : toolboxPrefix(
                ctx,
                toolboxName
            ) + command;
    }

    if ($("netDns").checked) {
        addStep(steps, {
            title: "DNS",
            description:
                execution === "pod"
                    ? "Resuelve el destino desde el Pod."
                    : "Resuelve el destino desde un Pod temporal.",
            command:
                networkCommand(
                    `getent hosts ${shellQuote(ctx.host)}`,
                    "netshoot-dns"
                ),
            check:
                "Debe devolver una IP.",
            tags: ["DNS"]
        });
    }

    if ($("netTcp").checked) {
        addStep(steps, {
            title: "TCP",
            description:
                "Comprueba conectividad al puerto.",
            command:
                networkCommand(
                    `nc -vz ${shellQuote(ctx.host)} ${shellQuote(ctx.port)}`,
                    "netshoot-tcp"
                ),
            check:
                "Diferencia timeout de connection refused.",
            tags: ["TCP"]
        });
    }

    if ($("netHttp").checked) {
        addStep(steps, {
            title: "HTTP / HTTPS",
            description:
                "Prueba conexión y respuesta de aplicación.",
            command:
                networkCommand(
                    `curl -vk ${urlFor(ctx)}`,
                    "netshoot-http"
                ),
            check:
                "Revisa DNS, TCP, TLS y código HTTP.",
            tags: ["HTTP"]
        });
    }

    if ($("netService").checked) {
        addStep(steps, {
            title: "Service",
            description:
                "Revisa definición del Service.",
            command:
                `${ctx.cli} get svc ${shellQuote(ctx.service)}${namespaceFlag(ctx)} -o wide`,
            check:
                "Confirma selector, port y targetPort.",
            tags: ["Service"]
        });
    }

    if ($("netEndpoints").checked) {
        addStep(steps, {
            title: "EndpointSlices",
            description:
                "Comprueba endpoints asociados al Service.",
            command:
                `${ctx.cli} get endpointslices${namespaceFlag(ctx)} -l kubernetes.io/service-name=${shellQuote(ctx.service)}`,
            check:
                "Sin endpoints, revisa selector y readiness.",
            tags: ["Service"]
        });
    }

    if ($("netPodIp").checked) {
        if (!ctx.pod) {
            showValidation([], ["pod"]);
            return null;
        }

        addStep(steps, {
            title: "IP del Pod",
            description:
                "Obtiene PodIP.",
            command:
                `${ctx.cli} get pod ${shellQuote(ctx.pod)}${namespaceFlag(ctx)} -o jsonpath='{.status.podIP}'`,
            check:
                "Confirma dirección asignada.",
            tags: ["Pod", "Network"]
        });
    }

    if ($("netNetworkPolicy").checked) {
        addStep(steps, {
            title: "NetworkPolicies",
            description:
                "Lista políticas del Namespace.",
            command:
                `${ctx.cli} get networkpolicy${namespaceFlag(ctx)}`,
            check:
                "Revisa reglas ingress/egress aplicables al Pod.",
            tags: ["NetworkPolicy"]
        });
    }

    if ($("netRouteTable").checked) {
        if (execution === "toolbox") {
            addStep(steps, {
                title: "Rutas del Pod temporal",
                description:
                    "Muestra tabla de rutas.",
                command:
                    toolboxPrefix(
                        ctx,
                        "netshoot-route"
                    ) + "ip route",
                check:
                    "Revisa default route y redes alcanzables.",
                tags: ["Network"]
            });
        } else {
            addStep(steps, {
                title: "Rutas del contenedor",
                description:
                    "Muestra tabla de rutas.",
                command:
                    `${ctx.cli} exec ${shellTarget(ctx)} -- ip route`,
                check:
                    "Revisa default route y redes alcanzables.",
                tags: ["Network"]
            });
        }
    }

    return steps;
}


function generateFileRunbook() {
    const ctx = context();

    const direction =
        $("copyDirection").value;

    const local =
        $("localPath").value.trim();

    const remote =
        $("remotePath").value.trim();

    const sshUser =
        $("sshUser").value.trim();

    const extras = [];

    if (!local) {
        extras.push("localPath");
    }

    if (!remote) {
        extras.push("remotePath");
    }

    if (
        direction === "to-pod" ||
        direction === "from-pod"
    ) {
        if (
            !showValidation(
                requiredFields(
                    ["namespace", "pod"]
                ),
                extras
            )
        ) {
            return null;
        }
    } else {
        if (!sshUser) {
            extras.push("sshUser");
        }

        if (
            !showValidation(
                requiredFields(["node"]),
                extras
            )
        ) {
            return null;
        }
    }

    const steps = [];

    const c = containerFlag(ctx);

    if (direction === "to-pod") {
        addStep(steps, {
            title: "Local → Pod",
            description:
                "Copia un archivo o directorio al Pod.",
            command:
                `${ctx.cli} cp ${shellQuote(local)} ${shellQuote(ctx.namespace)}/${shellQuote(ctx.pod)}:${shellQuote(remote)}${c}`,
            check:
                "Verifica posteriormente existencia, owner y permisos.",
            note:
                "kubectl/oc cp normalmente depende de tar dentro del contenedor.",
            tags: ["File", "Pod"]
        });
    }

    if (direction === "from-pod") {
        addStep(steps, {
            title: "Pod → Local",
            description:
                "Copia un archivo o directorio desde el Pod.",
            command:
                `${ctx.cli} cp ${shellQuote(ctx.namespace)}/${shellQuote(ctx.pod)}:${shellQuote(remote)} ${shellQuote(local)}${c}`,
            check:
                "Comprueba tamaño e integridad del archivo descargado.",
            note:
                "kubectl/oc cp normalmente depende de tar dentro del contenedor.",
            tags: ["File", "Pod"]
        });
    }

    if (direction === "to-node") {
        addStep(steps, {
            title: "Local → Worker",
            description:
                "Transferencia directa mediante SCP.",
            command:
                `scp ${shellQuote(local)} ${shellQuote(sshUser)}@${shellQuote(ctx.node)}:${shellQuote(remote)}`,
            check:
                "Confirma ruta destino y permisos del usuario SSH.",
            note:
                "Requiere acceso SSH directo al Worker. Kubernetes no proporciona kubectl cp hacia el filesystem del Node.",
            tags: ["File", "Node", "Warning"]
        });
    }

    if (direction === "from-node") {
        addStep(steps, {
            title: "Worker → Local",
            description:
                "Descarga mediante SCP.",
            command:
                `scp ${shellQuote(sshUser)}@${shellQuote(ctx.node)}:${shellQuote(remote)} ${shellQuote(local)}`,
            check:
                "Confirma permisos de lectura sobre el archivo remoto.",
            note:
                "Requiere acceso SSH directo al Worker.",
            tags: ["File", "Node", "Warning"]
        });
    }

    return steps;
}


function generateResourcesRunbook() {
    const ctx = context();

    const extras = [];

    if (
        ($("resPodUsage").checked ||
         $("resRequestsLimits").checked ||
         $("resRestartCount").checked) &&
        (!ctx.namespace || !ctx.pod)
    ) {
        if (!ctx.namespace) {
            extras.push("namespace");
        }

        if (!ctx.pod) {
            extras.push("pod");
        }
    }

    if (
        $("resNodePressure").checked &&
        !ctx.node
    ) {
        extras.push("node");
    }

    if (!showValidation([], extras)) {
        return null;
    }

    const steps = [];

    if ($("resTopNodes").checked) {
        addStep(steps, {
            title: "Top Nodes",
            description:
                "CPU y memoria por Node.",
            command:
                `${ctx.cli} top nodes`,
            check:
                "Busca nodes con consumo alto o desbalanceado.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources", "Node"]
        });
    }

    if ($("resTopPods").checked) {
        addStep(steps, {
            title: "Top Pods",
            description:
                "CPU y memoria de Pods.",
            command:
                `${ctx.cli} top pods -A`,
            check:
                "Ordena visualmente los mayores consumidores.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources", "Pod"]
        });
    }

    if ($("resTopContainers").checked) {
        addStep(steps, {
            title: "Top Containers",
            description:
                "CPU y memoria por container.",
            command:
                `${ctx.cli} top pods -A --containers`,
            check:
                "Permite identificar el container responsable dentro de cada Pod.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources", "Container"]
        });
    }

    if ($("resPodUsage").checked) {
        addStep(steps, {
            title: "Uso del Pod",
            description:
                "CPU y memoria por container del Pod.",
            command:
                `${ctx.cli} top pod ${shellQuote(ctx.pod)}${namespaceFlag(ctx)} --containers`,
            check:
                "Compara consumo con requests/limits.",
            note:
                "Requiere Metrics API/metrics-server.",
            tags: ["Resources", "Pod"]
        });
    }

    if ($("resRequestsLimits").checked) {
        addStep(steps, {
            title: "Requests / Limits",
            description:
                "Recursos configurados.",
            command:
                `${ctx.cli} get pod ${shellQuote(ctx.pod)}${namespaceFlag(ctx)} -o jsonpath='{range .spec.containers[*]}{.name}{" => "}{.resources}{"\\n"}{end}'`,
            check:
                "Revisa CPU/memory requests y limits.",
            tags: ["Resources"]
        });
    }

    if ($("resRestartCount").checked) {
        addStep(steps, {
            title: "Restart count",
            description:
                "Número de reinicios por container.",
            command:
                `${ctx.cli} get pod ${shellQuote(ctx.pod)}${namespaceFlag(ctx)} -o jsonpath='{range .status.containerStatuses[*]}{.name}{"="}{.restartCount}{"\\n"}{end}'`,
            check:
                "Valores crecientes indican inestabilidad.",
            tags: ["Pod"]
        });
    }

    if ($("resNodePressure").checked) {
        addStep(steps, {
            title: "Node Conditions",
            description:
                "Condiciones y presión del Node.",
            command:
                `${ctx.cli} get node ${shellQuote(ctx.node)} -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{"\\n"}{end}'`,
            check:
                "Revisa MemoryPressure, DiskPressure, PIDPressure y Ready.",
            tags: ["Node", "Resources"]
        });
    }

    return steps;
}


function generateTaskRunbook() {
    if (state.task === "inventory") {
        return generateInventoryRunbook();
    }

    if (state.task === "pod") {
        return generatePodTaskRunbook();
    }

    if (state.task === "access") {
        return generateAccessRunbook();
    }

    if (state.task === "network") {
        return generateNetworkRunbook();
    }

    if (state.task === "files") {
        return generateFileRunbook();
    }

    if (state.task === "resources") {
        return generateResourcesRunbook();
    }

    return [];
}


/* =========================================================
   ALTERNATIVAS
   ========================================================= */

function appendAlternatives(steps) {
    if (!$("includeAlternatives").checked) {
        return steps;
    }

    const ctx = context();

    const output = [...steps];

    const hasNc =
        steps.some(
            (s) => s.command.includes(" nc -vz ")
        );

    const hasCurl =
        steps.some(
            (s) => s.command.includes(" curl -vk ")
        );

    const hasSs =
        steps.some(
            (s) => s.command.includes(" ss -lntp")
        );

    const hasBash =
        steps.some(
            (s) => s.command.includes("-- /bin/bash")
        );

    if (
        hasNc &&
        ctx.host &&
        ctx.port &&
        ctx.namespace
    ) {
        addStep(output, {
            title: "Alternativa TCP con Pod temporal",
            description:
                "Úsala si nc no existe en la imagen de aplicación.",
            command:
                toolboxPrefix(
                    ctx,
                    "netshoot-alt"
                ) +
                `nc -vz ${shellQuote(ctx.host)} ${shellQuote(ctx.port)}`,
            check:
                "Permite separar un problema de red de la falta de herramientas dentro del container.",
            note:
                "Requiere permiso para crear Pods temporales.",
            tags: ["Alternative", "Debug"]
        });
    }

    if (
        hasCurl &&
        ctx.host &&
        ctx.port &&
        ctx.namespace
    ) {
        addStep(output, {
            title: "Alternativa HTTP con Pod temporal",
            description:
                "Úsala si curl no existe en la imagen.",
            command:
                toolboxPrefix(
                    ctx,
                    "netshoot-http-alt"
                ) +
                `curl -vk ${urlFor(ctx)}`,
            check:
                "Compara el resultado con la aplicación original.",
            note:
                "Requiere permiso para crear Pods temporales.",
            tags: ["Alternative", "Debug"]
        });
    }

    if (
        hasSs &&
        ctx.namespace &&
        ctx.pod
    ) {
        addStep(output, {
            title: "Alternativa a ss",
            description:
                "Prueba netstat si está disponible.",
            command:
                `${ctx.cli} exec ${shellTarget(ctx)} -- netstat -lntp`,
            check:
                "Algunas imágenes incluyen netstat pero no ss.",
            tags: ["Alternative"]
        });
    }

    if (
        hasBash &&
        ctx.namespace &&
        ctx.pod
    ) {
        addStep(output, {
            title: "Alternativa de shell",
            description:
                "Prueba /bin/sh si bash no existe.",
            command:
                `${ctx.cli} exec -it ${shellTarget(ctx)} -- /bin/sh`,
            check:
                "Imágenes mínimas frecuentemente no incluyen bash.",
            tags: ["Alternative"]
        });
    }

    return output;
}


/* =========================================================
   RENDER
   ========================================================= */

function renderRunbook(steps) {
    const container = $("runbookContainer");

    const includeChecks =
        $("includeChecks").checked;

    const includeSafety =
        $("includeSafety").checked;

    if (!steps || !steps.length) {
        state.steps = [];

        container.innerHTML =
            '<div class="empty-state">No seleccionaste ninguna validación o comando.</div>';

        $("runbookSummary")
            .classList.add("hidden");

        return;
    }

    const finalSteps =
        appendAlternatives(steps);

    state.steps = finalSteps;

    $("validationMessage")
        .classList.add("hidden");

    const warningCount =
        finalSteps.filter(
            (step) =>
                step.tags.includes("Warning") ||
                step.note
        ).length;

    const summary =
        $("runbookSummary");

    summary.classList.remove("hidden");

    summary.innerHTML =
        `<strong>${finalSteps.length} comandos generados.</strong> ` +
        `Modo: ${state.mode === "problem"
            ? "troubleshooting"
            : state.task}.` +
        (warningCount
            ? ` ${warningCount} paso(s) incluyen notas operativas.`
            : "");

    container.innerHTML =
        finalSteps.map(
            (step, index) => {

                const tags =
                    step.tags
                        .map(
                            (tag) =>
                                `<span class="step-tag ${
                                    tag === "Warning"
                                        ? "warning"
                                        : ""
                                }">${escapeHtml(tag)}</span>`
                        )
                        .join("");

                return `
                    <article class="runbook-step">

                        <div class="runbook-step-header">

                            <div>
                                <h3>
                                    ${index + 1}. ${escapeHtml(step.title)}
                                </h3>

                                <p>
                                    ${escapeHtml(step.description)}
                                </p>

                                <div class="step-meta">
                                    ${tags}
                                </div>
                            </div>

                            <button
                                class="copy-command"
                                data-index="${index}"
                                type="button"
                            >
                                Copiar
                            </button>

                        </div>

                        <pre class="command-block">${escapeHtml(step.command)}</pre>

                        ${
                            includeChecks &&
                            step.check
                                ? `<div class="runbook-check"><strong>Qué revisar:</strong> ${escapeHtml(step.check)}</div>`
                                : ""
                        }

                        ${
                            includeSafety &&
                            step.note
                                ? `<div class="runbook-note"><strong>Nota:</strong> ${escapeHtml(step.note)}</div>`
                                : ""
                        }

                    </article>
                `;
            }
        ).join("");

    container
        .querySelectorAll(".copy-command")
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    async () => {
                        const index =
                            Number(
                                button.dataset.index
                            );

                        await copyText(
                            state.steps[index].command,
                            button
                        );
                    }
                );
            }
        );

    container.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function generateRunbook() {
    const steps =
        state.mode === "problem"
            ? generateProblemRunbook()
            : generateTaskRunbook();

    if (steps === null) {
        return;
    }

    renderRunbook(steps);
}


/* =========================================================
   COPY / DOWNLOAD
   ========================================================= */

async function copyText(
    text,
    button = null
) {
    try {
        await navigator.clipboard.writeText(
            text
        );

        if (button) {
            const original =
                button.textContent;

            button.textContent =
                "Copiado ✓";

            setTimeout(
                () => {
                    button.textContent =
                        original;
                },
                1200
            );
        }

    } catch (error) {
        alert(
            "No fue posible copiar al portapapeles."
        );
    }
}


function runbookAsText() {
    return state.steps
        .map(
            (step, index) =>
                `# ${index + 1}. ${step.title}\n` +
                `# ${step.description}\n` +
                `${step.command}`
        )
        .join("\n\n");
}


async function copyAll() {
    if (!state.steps.length) {
        return;
    }

    await copyText(
        runbookAsText(),
        $("copyAllButton")
    );
}


function downloadScript() {
    if (!state.steps.length) {
        return;
    }

    const body =
        "#!/usr/bin/env bash\n\n" +
        "# Container & Kubernetes Assistant V2\n" +
        "# IMPORTANTE: revisa los comandos antes de ejecutarlos.\n" +
        "# Este archivo fue generado localmente en el navegador.\n\n" +
        runbookAsText() +
        "\n";

    const blob =
        new Blob(
            [body],
            {
                type:
                    "text/x-shellscript;charset=utf-8"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "k8s-runbook.sh";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


function clearResults() {
    state.steps = [];

    $("runbookContainer").innerHTML =
        '<div class="empty-state">Selecciona un problema o una tarea y pulsa <strong>Generar runbook</strong>.</div>';

    $("validationMessage")
        .classList.add("hidden");

    $("runbookSummary")
        .classList.add("hidden");
}


/* =========================================================
   ANALIZADOR DE SALIDA
   ========================================================= */

const analyzerRules = [
    {
        regex: /CrashLoopBackOff/i,
        severity: "danger",
        title: "CrashLoopBackOff detectado",
        detail:
            "El contenedor está reiniciando repetidamente.",
        problem: "crashloop"
    },

    {
        regex: /ImagePullBackOff|ErrImagePull/i,
        severity: "danger",
        title: "Problema de descarga de imagen",
        detail:
            "Revisa nombre de imagen, registry e ImagePullSecrets.",
        problem: "imagepull"
    },

    {
        regex: /\bOOMKilled\b/i,
        severity: "danger",
        title: "OOMKilled detectado",
        detail:
            "El contenedor pudo superar su límite de memoria.",
        problem: "memory"
    },

    {
        regex: /\bPending\b/i,
        severity: "warning",
        title: "Pod Pending",
        detail:
            "Revisa scheduling, recursos, taints, affinity y PVC.",
        problem: "pending"
    },

    {
        regex: /\bNotReady\b|Ready\s*=\s*False/i,
        severity: "danger",
        title: "Estado NotReady detectado",
        detail:
            "Si corresponde a un Node, revisa Conditions y eventos.",
        problem: "node-notready"
    },

    {
        regex: /FailedScheduling/i,
        severity: "warning",
        title: "FailedScheduling detectado",
        detail:
            "El scheduler no pudo ubicar el Pod en un Node.",
        problem: "pending"
    },

    {
        regex: /FailedMount|MountVolume|FailedAttachVolume/i,
        severity: "warning",
        title: "Problema de volumen detectado",
        detail:
            "Revisa PVC, PV, StorageClass y eventos.",
        problem: "storage"
    },

    {
        regex: /connection refused/i,
        severity: "warning",
        title: "Connection refused",
        detail:
            "El destino respondió, pero el puerto o servicio rechazó la conexión.",
        problem: "connectivity"
    },

    {
        regex: /timed out|timeout|i\/o timeout/i,
        severity: "warning",
        title: "Timeout detectado",
        detail:
            "Puede apuntar a ruta, firewall, NetworkPolicy o servicio no alcanzable.",
        problem: "connectivity"
    },

    {
        regex: /no such host|NXDOMAIN|SERVFAIL/i,
        severity: "warning",
        title: "Problema DNS detectado",
        detail:
            "Revisa resolución DNS y CoreDNS.",
        problem: "dns"
    },

    {
        regex: /Readiness probe failed|Liveness probe failed/i,
        severity: "warning",
        title: "Probe fallida",
        detail:
            "Revisa endpoint, puerto, tiempos y disponibilidad de la aplicación.",
        problem: "app-not-responding"
    }
];


function analyzeOutput() {
    const text =
        $("outputAnalyzer").value.trim();

    const result =
        $("analyzerResult");

    if (!text) {
        result.className =
            "analyzer-result warning";

        result.innerHTML =
            "<strong>No hay salida para analizar.</strong>";

        result.classList.remove("hidden");

        return;
    }

    const findings =
        analyzerRules.filter(
            (rule) => rule.regex.test(text)
        );

    if (!findings.length) {
        result.className =
            "analyzer-result";

        result.innerHTML =
            "<strong>No se detectó un patrón conocido.</strong><br>" +
            "La ausencia de coincidencias no significa que no exista un problema. " +
            "Puedes usar el modo por tarea para revisar estado, logs, eventos y configuración.";

        result.classList.remove("hidden");

        return;
    }

    const highestSeverity =
        findings.some(
            (f) => f.severity === "danger"
        )
            ? "danger"
            : "warning";

    const firstProblem =
        findings.find(
            (f) => f.problem
        )?.problem;

    result.className =
        `analyzer-result ${highestSeverity}`;

    result.innerHTML =
        "<strong>Hallazgos detectados:</strong>" +
        "<ul>" +
        findings
            .map(
                (finding) =>
                    `<li><strong>${escapeHtml(finding.title)}:</strong> ${escapeHtml(finding.detail)}</li>`
            )
            .join("") +
        "</ul>" +
        (
            firstProblem
                ? `<button class="secondary-button" id="applyAnalyzerFlow" type="button">Usar troubleshooting sugerido</button>`
                : ""
        );

    result.classList.remove("hidden");

    const applyButton =
        $("applyAnalyzerFlow");

    if (
        applyButton &&
        firstProblem
    ) {
        applyButton.addEventListener(
            "click",
            () => {
                setMode("problem");

                $("problemType").value =
                    firstProblem;

                $("problemDepth").value =
                    "standard";

                updateDynamicContext();

                window.scrollTo({
                    top:
                        $("problemModeSection")
                            .offsetTop - 20,
                    behavior: "smooth"
                });
            }
        );
    }
}


function clearAnalyzer() {
    $("outputAnalyzer").value = "";

    $("analyzerResult")
        .classList.add("hidden");

    $("analyzerResult").innerHTML = "";
}


/* =========================================================
   EVENTS
   ========================================================= */

document.querySelectorAll(".mode-card")
    .forEach(
        (card) => {
            card.addEventListener(
                "click",
                () =>
                    setMode(
                        card.dataset.mode
                    )
            );
        }
    );


document.querySelectorAll(".task-tab")
    .forEach(
        (tab) => {
            tab.addEventListener(
                "click",
                () =>
                    setTask(
                        tab.dataset.task
                    )
            );
        }
    );


[
    "platform",
    "namespace",
    "pod",
    "container",
    "node",
    "service",
    "host",
    "port"
].forEach(
    (id) => {
        $(id).addEventListener(
            "input",
            updateContextNote
        );

        $(id).addEventListener(
            "change",
            updateContextNote
        );
    }
);


[
    "problemType",
    "inventoryScope",
    "accessMode",
    "networkExecution",
    "copyDirection",
    "showAllContext",
    "netPodIp",
    "resPodUsage",
    "resRequestsLimits",
    "resRestartCount",
    "resNodePressure"
].forEach(
    (id) => {
        $(id).addEventListener(
            "change",
            () => {
                updateTaskSubPanels();
                updateDynamicContext();
            }
        );
    }
);


$("generateButton")
    .addEventListener(
        "click",
        generateRunbook
    );


$("copyAllButton")
    .addEventListener(
        "click",
        copyAll
    );


$("downloadScriptButton")
    .addEventListener(
        "click",
        downloadScript
    );


$("clearResultsButton")
    .addEventListener(
        "click",
        clearResults
    );


$("clearContextButton")
    .addEventListener(
        "click",
        clearContext
    );


$("analyzeOutputButton")
    .addEventListener(
        "click",
        analyzeOutput
    );


$("clearAnalyzerButton")
    .addEventListener(
        "click",
        clearAnalyzer
    );


/* =========================================================
   INIT
   ========================================================= */

setMode("problem");

setTask("inventory");

updateTaskSubPanels();

updateDynamicContext();
