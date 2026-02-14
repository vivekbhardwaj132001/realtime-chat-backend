import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;

  // Replace with IP
  static const String serverUrl = "http://192.168.1.40:5001";

  void initSocket(String userId) {
    socket = IO.io(serverUrl, IO.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect() 
        .build());

    socket.connect();

    socket.onConnect((_) {
      print('Connected to Socket Server: ${socket.id}');
      socket.emit('join_user', userId);
    });

    socket.onDisconnect((_) => print('Disconnected from Socket Server'));
  }

  // Chat
  void sendMessage(String receiverId, String message) {
    socket.emit('send_message', {
      'senderId': 'MY_ID', // You need to store/retrieve current user ID
      'receiverId': receiverId,
      'message': message,
      'type': 'text'
    });
  }

  // Video Matching
  void findMatch(String userId) {
    socket.emit('find_match', {'userId': userId});
  }

  void listenForMatch(Function(String partnerId, bool initiator) onMatch) {
    socket.on('match_found', (data) {
      onMatch(data['partnerId'], data['initiator']);
    });
  }
}
