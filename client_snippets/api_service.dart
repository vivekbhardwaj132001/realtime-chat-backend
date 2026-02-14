import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Replace with your local IP if running on valid device, e.g. "http://192.168.1.5:5001/api"
  // For Android Emulator use: "http://10.0.2.2:5001/api"
  // CURRENT LOCAL IP for Real Device:
  static const String baseUrl = "http://192.168.1.40:5001/api"; 

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  // Auth: Send OTP
  static Future<bool> sendOtp(String phone) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/send-otp'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"phone": phone}),
      );
      print("Send OTP: ${response.body}");
      return response.statusCode == 200;
    } catch (e) {
      print("Error sending OTP: $e");
      return false;
    }
  }

  // Auth: Verify OTP
  static Future<Map<String, dynamic>?> verifyOtp(String phone, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"phone": phone, "otp": otp}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
          await saveToken(data['token']);
        }
        return data; // returns { token, user, isNewUser }
      }
      return null;
    } catch (e) {
      print("Error verifying OTP: $e");
      return null;
    }
  }

  // User: Update Profile
  static Future<bool> updateProfile(Map<String, dynamic> data) async {
    final token = await getToken();
    if (token == null) return false;

    final response = await http.put(
      Uri.parse('$baseUrl/users/profile'),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token"
      },
      body: jsonEncode(data),
    );
    return response.statusCode == 200;
  }
}
