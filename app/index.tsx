import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const LOCATION_TASK_NAME = "background-location-task";

export default function Page() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Request permissions (foreground + background)
  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let bgStatus = "granted";

      if (Platform.OS === "android") {
        const bg = await Location.requestBackgroundPermissionsAsync();
        bgStatus = bg.status;
      }

      if (status === "granted" && bgStatus === "granted") {
        setHasPermission(true);
        startBackgroundLocation();
      } else {
        setHasPermission(false);
        setErrorMsg("Permission denied!");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error requesting permissions");
    }
  };

  // Start background location tracking
  const startBackgroundLocation = async () => {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
        foregroundService: {
          notificationTitle: "Karen For Good",
          notificationBody: "Tracking your location in background",
          notificationColor: "#FF0000",
        },
        pausesUpdatesAutomatically: false,
      });
    } catch (error) {
      console.error("Failed to start background location:", error);
    }
  };

  // Subscribe to foreground updates to show on screen
  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const subscribe = async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
        (loc) => setLocation(loc)
      );
    };

    if (hasPermission) {
      subscribe();
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [hasPermission]);

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <>
          <Text style={styles.text}>Location tracking active:</Text>
          {location ? (
            <Text style={styles.text}>
              Lat: {location.coords.latitude.toFixed(6)}, Lon:{" "}
              {location.coords.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.text}>Getting location...</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.text}>
            Please give permission to location to activate the app
          </Text>
          <Button title="Give access to location" onPress={requestPermission} />
          {errorMsg && <Text style={{ color: "red" }}>{errorMsg}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
});

// Background task
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const loc = locations[0];
    console.log(
      `Background location: Lat ${loc.coords.latitude}, Lon ${loc.coords.longitude}`
    );
    // Optional: send location to server or store locally
  }
});
