#!/bin/bash

# Función para imprimir separadores visuales
separador() {
  echo ""
  echo "------------------------------------------------------------"
  echo "CONTROL $1 - $2"
  echo "------------------------------------------------------------"
  echo ""
}
# Función para evitar interrupciones en la ejecución de script
run_control() {
  local control_name=$1

  echo ""
  echo ">>> Ejecutando $control_name ..."
  if $control_name; then
    echo "$control_name finalizó correctamente"
  else
    echo "$control_name encontró errores (continuando)"
  fi
}

# ===================================================

control_2_2() {
  separador "2.2" "Asegúrese de que el software autorizado sea compatible actualmente"

  echo "[1] Verificación de versión del sistema operativo:"
  if [ -f /etc/redhat-release ]; then
    cat /etc/redhat-release
    if command -v rpm &>/dev/null; then
      rhel_version=$(rpm -q --qf "%{VERSION}\n" redhat-release)
      if [[ "$rhel_version" -ge 8 ]]; then
        echo "OK: RHEL $rhel_version está dentro del soporte general."
      else
        echo "FALLO: RHEL $rhel_version puede estar fuera de soporte."
      fi
    else
      echo "OMITIDO: No se puede ejecutar rpm para validar versión exacta."
    fi
  else
    echo "OMITIDO: No se encontró /etc/redhat-release"
  fi

  echo
  echo "[2] Verificación del instalador OpenShift:"
  if command -v openshift-install &>/dev/null; then
    openshift-install version
  else
    echo "OMITIDO: openshift-install no está instalado en este nodo."
  fi

  echo
  echo "[3] Revisión de paquetes obsoletos:"
  if command -v yum &>/dev/null; then
    obsoletos=$(yum list installed | grep -Ei 'deprecated|obsoleted|no longer supported')
    if [ -n "$obsoletos" ]; then
      echo "FALLO: Se encontraron paquetes posiblemente obsoletos:"
      echo "$obsoletos"
    else
      echo "OK: No se detectaron paquetes obsoletos."
    fi
  else
    echo "OMITIDO: No se pudo ejecutar 'yum list'."
  fi

  echo
  echo "[4] Verificación de configuraciones no compatibles:"
  manifest="/etc/kubernetes/manifests/kube-apiserver-pod.yaml"
  if [ -f "$manifest" ]; then
    configs=( "--authorization-mode=AlwaysAllow" "--enable-admission-plugins=AlwaysAdmit" "--anonymous-auth=true" )
    found=false
    for config in "${configs[@]}"; do
      if grep -q "$config" "$manifest"; then
        echo "FALLO: Configuración no compatible: $config"
        found=true
      fi
    done
    if [ "$found" = false ]; then
      echo "OK: No se encontraron configuraciones no compatibles en el manifiesto del API Server."
    fi
  else
    echo "OMITIDO: No se encontró el manifiesto del API Server ($manifest)."
  fi

  echo
  echo "[5] Recomendación adicional:"
  echo "Revise manualmente la lista de software autorizado y fechas de soporte."
  echo "Use Red Hat Insights o herramientas de gestión compatibles con ROSA."

  echo
  echo "Verificación finalizada para control CIS 2.2"
}

# ===================================================
# Función principal que ejecuta todos los controles

main() {
  echo "============================================================"
  echo "INICIO DE VALIDACIÓN DE CONTROLES CIS - OpenShift (ROSA)"
  echo "Fecha: $(date)"
  echo "Usuario autenticado: $(oc whoami 2>/dev/null || echo 'No autenticado')"
  echo "============================================================"

  run_control control_2_2  
  run_control control_2_7
  run_control control_3_3
  run_control control_3_10
  run_control control_3_11
  run_control control_3_12
  run_control control_4_1
  run_control control_4_4
  run_control control_4_6
  run_control control_4_8
  run_control control_4_9
  run_control control_5_2
  run_control control_5_3
  run_control control_5_4
  run_control control_6_8
  run_control control_7_3
  run_control control_8_1
  run_control control_8_2
  run_control control_8_3
  run_control control_8_5
  run_control control_9_3
  run_control control_10_5
  run_control control_12_6
  run_control control_12_8
  run_control control_13_10
  run_control control_16_11

  echo ""
  echo ""
  echo "============================================================"
  echo "VALIDACIÓN COMPLETA"
  echo "============================================================"
}

# Ejecutar función principal
main


