<?php
/**
 * Elementor widget class definitions.
 *
 * This file is required from inside the elementor/widgets/register hook so that
 * \Elementor\Widget_Base is guaranteed to exist when the classes are defined.
 * Do NOT require this file earlier in the boot process.
 */
defined( 'ABSPATH' ) || exit;

// ─── Widget: Schedule ────────────────────────────────────────────────────────

class MatConnect_Widget_Schedule extends \Elementor\Widget_Base {

    public function get_name()       { return 'matconnect_schedule'; }
    public function get_title()      { return esc_html__( 'MatConnect Schedule', 'matconnect' ); }
    public function get_icon()       { return 'eicon-calendar'; }
    public function get_categories() { return [ 'matconnect' ]; }
    public function get_keywords()   { return [ 'matconnect', 'schedule', 'classes', 'bjj', 'jiu-jitsu' ]; }

    protected function register_controls() {
        $this->start_controls_section( 'content', [
            'label' => esc_html__( 'Settings', 'matconnect' ),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ] );

        $this->add_control( 'days_ahead', [
            'label'       => esc_html__( 'Days ahead', 'matconnect' ),
            'description' => esc_html__( 'How many days of classes to display (1–14).', 'matconnect' ),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'default'     => 7,
            'min'         => 1,
            'max'         => 14,
            'step'        => 1,
        ] );

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        echo matconnect_render_schedule( [ 'daysAhead' => intval( $s['days_ahead'] ?? 7 ) ] );
    }
}

// ─── Widget: Pricing ─────────────────────────────────────────────────────────

class MatConnect_Widget_Pricing extends \Elementor\Widget_Base {

    public function get_name()       { return 'matconnect_pricing'; }
    public function get_title()      { return esc_html__( 'MatConnect Pricing', 'matconnect' ); }
    public function get_icon()       { return 'eicon-price-table'; }
    public function get_categories() { return [ 'matconnect' ]; }
    public function get_keywords()   { return [ 'matconnect', 'pricing', 'plans', 'membership' ]; }

    protected function register_controls() {
        $this->start_controls_section( 'content', [
            'label' => esc_html__( 'Settings', 'matconnect' ),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ] );

        $this->add_control( 'show_cta', [
            'label'        => esc_html__( 'Show "Get started" button', 'matconnect' ),
            'type'         => \Elementor\Controls_Manager::SWITCHER,
            'label_on'     => esc_html__( 'Yes', 'matconnect' ),
            'label_off'    => esc_html__( 'No', 'matconnect' ),
            'return_value' => 'yes',
            'default'      => 'yes',
        ] );

        $this->add_control( 'cta_label', [
            'label'     => esc_html__( 'Button label', 'matconnect' ),
            'type'      => \Elementor\Controls_Manager::TEXT,
            'default'   => esc_html__( 'Get started', 'matconnect' ),
            'condition' => [ 'show_cta' => 'yes' ],
        ] );

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        echo matconnect_render_pricing( [
            'showCta'  => ( $s['show_cta'] ?? 'yes' ) === 'yes',
            'ctaLabel' => sanitize_text_field( $s['cta_label'] ?? __( 'Get started', 'matconnect' ) ),
        ] );
    }
}

// ─── Widget: Lead Form ───────────────────────────────────────────────────────

class MatConnect_Widget_Lead_Form extends \Elementor\Widget_Base {

    public function get_name()       { return 'matconnect_lead_form'; }
    public function get_title()      { return esc_html__( 'MatConnect Lead Form', 'matconnect' ); }
    public function get_icon()       { return 'eicon-form-horizontal'; }
    public function get_categories() { return [ 'matconnect' ]; }
    public function get_keywords()   { return [ 'matconnect', 'lead', 'form', 'contact', 'signup' ]; }

    protected function register_controls() {
        $this->start_controls_section( 'content', [
            'label' => esc_html__( 'Settings', 'matconnect' ),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ] );

        $this->add_control( 'success_message', [
            'label'       => esc_html__( 'Success message', 'matconnect' ),
            'description' => esc_html__( 'Shown after a successful submission.', 'matconnect' ),
            'type'        => \Elementor\Controls_Manager::TEXTAREA,
            'default'     => esc_html__( "Thanks! We'll be in touch soon.", 'matconnect' ),
            'rows'        => 2,
        ] );

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        echo matconnect_render_lead_form( [
            'successMessage' => sanitize_text_field( $s['success_message'] ?? '' ),
        ] );
    }
}

// ─── Widget: Testimonials ────────────────────────────────────────────────────

class MatConnect_Widget_Testimonials extends \Elementor\Widget_Base {

    public function get_name()       { return 'matconnect_testimonials'; }
    public function get_title()      { return esc_html__( 'MatConnect Testimonials', 'matconnect' ); }
    public function get_icon()       { return 'eicon-testimonial'; }
    public function get_categories() { return [ 'matconnect' ]; }
    public function get_keywords()   { return [ 'matconnect', 'testimonials', 'reviews', 'members' ]; }

    protected function register_controls() {
        $this->start_controls_section( 'content', [
            'label' => esc_html__( 'Settings', 'matconnect' ),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ] );

        $this->add_control( 'max_items', [
            'label'       => esc_html__( 'Max testimonials', 'matconnect' ),
            'description' => esc_html__( 'Set to 0 to show all.', 'matconnect' ),
            'type'        => \Elementor\Controls_Manager::NUMBER,
            'default'     => 0,
            'min'         => 0,
            'max'         => 20,
            'step'        => 1,
        ] );

        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        echo matconnect_render_testimonials( [ 'maxItems' => intval( $s['max_items'] ?? 0 ) ] );
    }
}

// ─── Widget: FAQ ─────────────────────────────────────────────────────────────

class MatConnect_Widget_FAQ extends \Elementor\Widget_Base {

    public function get_name()       { return 'matconnect_faq'; }
    public function get_title()      { return esc_html__( 'MatConnect FAQ', 'matconnect' ); }
    public function get_icon()       { return 'eicon-accordion'; }
    public function get_categories() { return [ 'matconnect' ]; }
    public function get_keywords()   { return [ 'matconnect', 'faq', 'accordion', 'questions' ]; }

    protected function register_controls() {
        $this->start_controls_section( 'content', [
            'label' => esc_html__( 'Settings', 'matconnect' ),
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ] );

        $this->add_control( 'info', [
            'type'            => \Elementor\Controls_Manager::RAW_HTML,
            'raw'             => esc_html__( 'FAQ items are managed in MatConnect → Settings → Website → FAQ.', 'matconnect' ),
            'content_classes' => 'elementor-descriptor',
        ] );

        $this->end_controls_section();
    }

    protected function render() {
        echo matconnect_render_faq( [] );
    }
}
