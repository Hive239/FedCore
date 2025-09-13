-- Add Gantt chart header template field to report_templates
ALTER TABLE public.report_templates 
ADD COLUMN IF NOT EXISTS gantt_header_template TEXT DEFAULT 'default';

-- Add other Gantt-specific settings
ALTER TABLE public.report_templates
ADD COLUMN IF NOT EXISTS gantt_show_contractor BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS gantt_show_project_details BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS gantt_default_view TEXT DEFAULT 'month',
ADD COLUMN IF NOT EXISTS gantt_color_scheme TEXT DEFAULT 'status';

-- Update comment on table
COMMENT ON COLUMN public.report_templates.gantt_header_template IS 'Template format for Gantt chart PDF headers';
COMMENT ON COLUMN public.report_templates.gantt_show_contractor IS 'Show contractor info in Gantt PDF';
COMMENT ON COLUMN public.report_templates.gantt_show_project_details IS 'Show project details in Gantt PDF';
COMMENT ON COLUMN public.report_templates.gantt_default_view IS 'Default view mode for Gantt chart (week/month/quarter)';
COMMENT ON COLUMN public.report_templates.gantt_color_scheme IS 'Default color scheme for Gantt bars (status/priority/type)';