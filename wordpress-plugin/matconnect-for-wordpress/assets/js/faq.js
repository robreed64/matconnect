document.addEventListener( 'DOMContentLoaded', function () {
    document.querySelectorAll( '.matconnect-faq' ).forEach( function ( faq ) {
        faq.querySelectorAll( '.mc-faq-question' ).forEach( function ( btn ) {
            btn.addEventListener( 'click', function () {
                var answer   = btn.nextElementSibling;
                var expanded = btn.getAttribute( 'aria-expanded' ) === 'true';
                var icon     = btn.querySelector( '.mc-faq-icon' );

                btn.setAttribute( 'aria-expanded', String( ! expanded ) );
                answer.hidden = expanded;
                if ( icon ) icon.textContent = expanded ? '+' : '×';
            } );
        } );
    } );
} );
