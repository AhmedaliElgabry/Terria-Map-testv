module.exports = function (Handlebars) {

    Handlebars.registerHelper('formatMessageBody', (context) => {
        const message = context.split('\n').map(line => {
            const isValidMsgStrg = isValidMessageString(line);
            if (!isValidMsgStrg) {
                return '';
            } else {
                return ''.concat('\n\t * > ', line);
            }
        }).join('');

        return message;
    });

    Handlebars.registerHelper('startsWith', function (_txt, startswith) {
        const _startswith = startswith.split(',');
        const doesStartsWith = _startswith.find(sw => _txt.startsWith(sw.trim()));
        return doesStartsWith ? null : _txt;
    });

};

/**
 * Check if a message is a string and is not empty, just whitespace, null, undefined, or contains just a newline
 * @param {string} msg 
 */
const isValidMessageString = (msg) => {
    return (typeof msg === 'string' && msg.trim() !== '' && msg !== '\n' && msg !== null && msg !== undefined);
};
