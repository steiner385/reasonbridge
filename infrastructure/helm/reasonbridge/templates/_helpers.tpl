{{/* Common labels applied to every object in the chart. */}}
{{- define "reasonbridge.labels" -}}
app.kubernetes.io/part-of: reason-bridge
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/* Fully-qualified name for a component: <release>-<component>. */}}
{{- define "reasonbridge.componentName" -}}
{{- printf "%s-%s" .release .name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
