import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const LOCATION_TASK_NAME = "background-location-task";

export default function Page() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const { status: bgStatus } =
      Platform.OS === "android"
        ? await Location.requestBackgroundPermissionsAsync()
        : { status: "granted" };

    if (status === "granted" && bgStatus === "granted") {
      setHasPermission(true);
      startBackgroundLocation();
    } else {
      setHasPermission(false);
      setErrorMsg("Permission denied!");
    }
  };

  const startBackgroundLocation = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000, // update every 1 second
        distanceInterval: 1, // update every 1 meter
        foregroundService: {
          notificationTitle: "Karen For Good",
          notificationBody: "Tracking your location in background",
          notificationColor: "#FF0000",
        },
        pausesUpdatesAutomatically: false,
      });
    }
  };

  useEffect(() => {
    // Subscribe to foreground updates to show in UI
    const subscription = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
      (loc) => setLocation(loc)
    );

    return () => {
      subscription.then((sub) => sub.remove());
    };
  }, []);

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

// Task Manager for background updates
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    console.log("Background location:", locations[0].coords);
  }
});
