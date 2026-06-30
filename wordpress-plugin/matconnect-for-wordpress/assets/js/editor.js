( function ( blocks, el ) {
    var placeholder = function ( title, desc ) {
        return el( 'div', {
            style: {
                padding: '20px',
                border: '2px dashed #c7d2fe',
                borderRadius: '8px',
                background: '#eef2ff',
                textAlign: 'center',
                fontFamily: 'sans-serif',
            }
        },
            el( 'strong', { style: { display: 'block', color: '#3730a3' } }, title ),
            el( 'p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: '13px' } }, desc )
        );
    };

    blocks.registerBlockType( 'matconnect/schedule', {
        title:      'MatConnect Schedule',
        icon:       'calendar',
        category:   'widgets',
        attributes: { daysAhead: { type: 'integer', default: 7 } },
        edit: function ( props ) {
            return placeholder(
                'MatConnect Schedule',
                'Displays the next ' + ( props.attributes.daysAhead || 7 ) + ' days of classes.'
            );
        },
        save: function () { return null; }
    } );

    blocks.registerBlockType( 'matconnect/pricing', {
        title:      'MatConnect Pricing',
        icon:       'tag',
        category:   'widgets',
        attributes: {
            showCta:  { type: 'boolean', default: true },
            ctaLabel: { type: 'string',  default: 'Get started' },
        },
        edit: function () {
            return placeholder( 'MatConnect Pricing', 'Displays live membership plans.' );
        },
        save: function () { return null; }
    } );

    blocks.registerBlockType( 'matconnect/lead-form', {
        title:      'MatConnect Lead Form',
        icon:       'email',
        category:   'widgets',
        attributes: { successMessage: { type: 'string', default: '' } },
        edit: function () {
            return placeholder( 'MatConnect Lead Form', 'Captures name, email, phone, and interest.' );
        },
        save: function () { return null; }
    } );

    blocks.registerBlockType( 'matconnect/testimonials', {
        title:      'MatConnect Testimonials',
        icon:       'format-quote',
        category:   'widgets',
        attributes: { maxItems: { type: 'integer', default: 0 } },
        edit: function () {
            return placeholder( 'MatConnect Testimonials', 'Displays member testimonials.' );
        },
        save: function () { return null; }
    } );

    blocks.registerBlockType( 'matconnect/faq', {
        title:      'MatConnect FAQ',
        icon:       'editor-help',
        category:   'widgets',
        attributes: {},
        edit: function () {
            return placeholder( 'MatConnect FAQ', 'Renders the FAQ accordion.' );
        },
        save: function () { return null; }
    } );

} )( window.wp.blocks, window.wp.element.createElement );
