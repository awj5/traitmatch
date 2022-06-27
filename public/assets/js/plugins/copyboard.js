/*

Copyboard v1.1
Easy JS copy to clipboard.

https://github.com/awj5/copyboard

By Adam Johnson
MIT License 2019

*/
'use strict';

class Copyboard {
    static copy(string) {
        // Create input
        const input = document.createElement('input');
        input.setAttribute('id', 'copyToClipboard');
        input.value = string;
        input.style.opacity = 0;
        document.querySelector('body').after(input);

        // Get input and select value
        const copyToClipboard = document.querySelector('input#copyToClipboard');
        copyToClipboard.select();

        // Copy then remove
        document.execCommand('copy');
        copyToClipboard.remove();
    }
}