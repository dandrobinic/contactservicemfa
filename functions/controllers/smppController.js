var smpp = require('smpp');
var session = smpp.connect({
	url: 'smpp://pcaha.claro.com.co:8001',
	auto_enquire_link_period: 10000,
	debug: true
}, function() {
	session.bind_transceiver({
		system_id: '',
		password: ''
	}, function(pdu) {
		if (pdu.command_status === 0) {
			// Successfully bound
			session.submit_sm({
				destination_addr: 'DESTINATION NUMBER',
				short_message: 'Hello!'
			}, function(pdu) {
				if (pdu.command_status === 0) {
					// Message successfully sent
					console.log(pdu.message_id);
				}
			});
		}
	});
});