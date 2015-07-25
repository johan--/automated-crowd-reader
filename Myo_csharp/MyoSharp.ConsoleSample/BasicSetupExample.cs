using System;

using MyoSharp.Communication;
using MyoSharp.Device;
using MyoSharp.ConsoleSample.Internal;
using MyoSharp.Exceptions;
using System.Net;

namespace MyoSharp.ConsoleSample
{
    /// <summary>
    /// This example will show you the basics for setting up and working with 
    /// a Myo using MyoSharp. Primary communication with the device happens 
    /// over Bluetooth, but this C# wrapper hooks into the unmanaged Myo SDK to
    /// listen on their "hub". The unmanaged hub feeds us information about 
    /// events, so a channel within MyoSharp is responsible for publishing 
    /// these events for other C# code to consume. A device listener uses a 
    /// channel to listen for pairing events. When a Myo pairs up, a device 
    /// listener publishes events for others to listen to. Once we have access 
    /// to a channel and a Myo handle (from something like a Pair event), we 
    /// can create our own Myo object. With a Myo object, we can do things like
    /// cause it to vibrate or monitor for poses changes.
    /// </summary>
    /// <remarks>
    /// Not sure how to use this example?
    /// - Open Visual Studio
    /// - Go to the solution explorer
    /// - Find the project that this file is contained within
    /// - Right click on the project in the solution explorer, go to "properties"
    /// - Go to the "Application" tab
    /// - Under "Startup object" pick this example from the list
    /// - Hit F5 and you should be good to go!
    /// </remarks>
    internal class BasicSetupExample
    {
        private static WebRequest _webRequest;
        private static string _destinationUrl = "http://localhost:1337/myo_command/";
        private static bool _enableWebTransmission = false;

        #region Methods
        private static void Main()
        {
            // create a hub that will manage Myo devices for us
            using (var channel = Channel.Create(
                ChannelDriver.Create(ChannelBridge.Create(),
                MyoErrorHandlerDriver.Create(MyoErrorHandlerBridge.Create()))))
            using (var hub = Hub.Create(channel))
            {
                // listen for when the Myo connects
                hub.MyoConnected += (sender, e) =>
                {
                    Console.WriteLine("Myo {0} has connected!", e.Myo.Handle);
                    e.Myo.Vibrate(VibrationType.Short);
                    e.Myo.PoseChanged += Myo_PoseChanged;
                    e.Myo.Locked += Myo_Locked;
                    e.Myo.Unlocked += Myo_Unlocked;
                };

                // listen for when the Myo disconnects
                hub.MyoDisconnected += (sender, e) =>
                {
                    Console.WriteLine("Oh no! It looks like {0} arm Myo has disconnected!", e.Myo.Arm);
                    e.Myo.PoseChanged -= Myo_PoseChanged;
                    e.Myo.Locked -= Myo_Locked;
                    e.Myo.Unlocked -= Myo_Unlocked;
                };

                // start listening for Myo data
                channel.StartListening();

                // wait on user input
                ConsoleHelper.UserInputLoop(hub);
            }
        }
        #endregion

        #region Event Handlers
        private static void Myo_PoseChanged(object sender, PoseEventArgs e)
        {
            Console.WriteLine("{0} arm Myo detected {1} pose!", e.Myo.Arm, e.Myo.Pose);
            string requestUri = _destinationUrl;
            switch (e.Myo.Pose)
            {
                case Poses.Pose.WaveIn:
                    Console.WriteLine("Previous Track");
                    requestUri += "previous_track";
                    break;
                case Poses.Pose.WaveOut:
                    Console.WriteLine("Next Track");
                    requestUri += "next_track";
                    break;
                case Poses.Pose.FingersSpread:
                     Console.WriteLine("Volume Up");
                    requestUri += "volume_up";
                   break;
                case Poses.Pose.Fist:
                     Console.WriteLine("Volume Down");
                    requestUri += "volume_down";
                    break;
                case Poses.Pose.Rest:
                    break;
                case Poses.Pose.DoubleTap:
                     Console.WriteLine("start_stop");
                     requestUri += "start_stop";
                    break;
                default:
                    break;
            }
            if (_enableWebTransmission)
            {
                try
                {
                    _webRequest = WebRequest.Create(requestUri);
                    _webRequest.Method = "POST";
                    WebResponse response = _webRequest.GetResponse();
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }
        }

        private static void Myo_Unlocked(object sender, MyoEventArgs e)
        {
            Console.WriteLine("{0} arm Myo has unlocked!", e.Myo.Arm);
        }

        private static void Myo_Locked(object sender, MyoEventArgs e)
        {
            Console.WriteLine("{0} arm Myo has locked!", e.Myo.Arm);
        }
        #endregion
    }
}