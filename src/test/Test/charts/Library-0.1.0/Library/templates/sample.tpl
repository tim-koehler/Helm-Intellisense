{{/* vim: set filetype=mustache: */}}
{{/*
Generate resource requests and limits for a container.
*/}}
{{- define "TestLibrary.resources" -}}
resources:
    requests:
        memory: {{ .Values.resources.requests.memory | default "64Mi" }}
        cpu: {{ .Values.resources.requests.cpu | default "250m" }}
    limits:
        memory: {{ .Values.resources.limits.memory | default "128Mi" }}
        cpu: {{ .Values.resources.limits.cpu | default "500m" }}
{{- end -}}