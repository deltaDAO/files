import torch
import os
import zipfile
import shutil
from pprint import pprint
import json
from PIL import Image
from datetime import datetime
from pathlib import Path
DETECTION_CLASSES = {
    'D00': 'longitudinal crack',
    'D10': 'transverse crack',
    'D20': 'mesh crack',
    'D40': 'pothole'
}


def get_image_info(image_paths):
    valid_images = {}
    for path_str in image_paths:
        try:
            # Attempt to open the image
            with Image.open(path_str) as img:
                # Check if the image is in JPEG format and valid image file
                if img.format == 'JPEG':
                    image_info = {'path': path_str}
                    exif_data = img.getexif()

                    '''
                    gps_exif:
                    {0: b'\x02\x03\x00\x00',
                    1: 'N',
                    2: (53.0, 38.0, 26.77),
                    3: 'E',
                    4: (9.0, 47.0, 5.21)}
                    '''
                    gps_exif = exif_data.get_ifd(0x8825) if exif_data else None
                    
                    if gps_exif:
                        image_info['gpsCoordinates'] = {
                            'lat': decimal_coords(gps_exif[2], gps_exif[1]),
                            'lng': decimal_coords(gps_exif[4], gps_exif[3])
                        }
                    
                    # TODO toke original date time stamp when example found to test with
                    # original_date_time_exif = exif_data.get_ifd(
                    #     0x9003) if exif_data else None
                    # original_date_timezone_offset_exif = exif_data.get_ifd(
                    #     0x9011) if exif_data else None
                    
                    # created_date_time_exif = exif_data.get_ifd(
                    #     0x9004) if exif_data else None
                    # created_date_timezone_offset_exif = exif_data.get_ifd(
                    #     0x9012) if exif_data else None
                    # pprint(original_date_time_exif)
                    # pprint(original_date_timezone_offset_exif)
                    # pprint(created_date_time_exif)
                    # pprint(created_date_timezone_offset_exif)

                    image_info['lastObservation'] = get_system_time_iso() # TODO use system time as placeholder
                    
                    filename = Path(path_str).name
                    valid_images[filename] = image_info # TODO HERE
                    
        except (IOError, SyntaxError) as e:
            # This catches files that cannot be opened or are not valid images
            print(f"Invalid image or error opening image: {path_str}, error: {e}")
    return valid_images


def decimal_coords(coords, ref):
    decimal_degrees = float(coords[0] + coords[1] / 60 + coords[2] / 3600)
    if ref == "S" or ref == 'W':
        decimal_degrees = -decimal_degrees
    return decimal_degrees

def get_system_time_iso():
    # Get the current system local time
    current_time_local = datetime.now().astimezone()

    # Convert to ISO format string
    iso_timestamp = current_time_local.isoformat()
    
    return iso_timestamp


def unzip_input(zip_path):
    # Check if the path exists and is a file
    if not os.path.exists(zip_path) or not os.path.isfile(zip_path):
        raise FileNotFoundError(
            'The specified path does not exist or is not a file.')

    # Assuming the directory where we want to extract is the same as the zip file's directory
    directory_path = os.path.dirname(zip_path)

    # Extract the zip file
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(directory_path)

    return directory_path


def load_images():
    is_local_test = os.environ.get('LOCAL_TEST')
    input_file_path = ''
    input_folder_path = ''
    if not is_local_test:
        DIDS = json.loads(os.getenv('DIDS'))
        DID = DIDS[0]
        input_folder_path = f'/data/inputs/{DID}'
        input_file_path = f'/data/inputs/{DID}/0'
    else:  # local testing
        # Get the directory of the current script file
        print('Found LOCAL_TEST env, using local dir folders.')
        current_dir = os.path.dirname(__file__)
        input_file_path = os.path.join(
            current_dir, 'data', 'inputs', '0')
        input_folder_path = os.path.join(
            current_dir, 'data', 'inputs')

    unzip_input(input_file_path)

    jpg_file_ending_paths = []  # List to hold paths of jpg images
    for root, dirs, files in os.walk(input_folder_path):
        for file in files:
            if file.lower().endswith('.jpg') or file.lower().endswith('.jpeg'):
                full_path = os.path.join(root, file)
                jpg_file_ending_paths.append(full_path)

    jpg_image_infos = get_image_info(jpg_file_ending_paths)
    return jpg_image_infos


def create_detections_list(image_info, detections):
    '''
        Example result:
        [{
            'resultName': 'annotated_result_image_name.jpeg', // image name in data_outputs directory
            'roadDamages': [
                {
                    'type': 'pothole',
                    'damageClass': 'D40',
                    'lastObservation': '2001-10-26T21:32:52', // timestamp of image taken
                    'gpsCoordinate': {
                        'lat': 12.1234,
                        'lng': 12.1234
                    },
                    'confidence': 0.23
                }
            ]
        }]
    '''

    final_detections_list = []
    for img_result in detections:
        detection_result = {
            'resultName': img_result['resultName'],
            'roadDamages': []
        }
        for detection in img_result['roadDamages']:
            damage = {
                'type': DETECTION_CLASSES[detection['name']],
                'damageClass': detection['name'],
                'lastObservation': image_info[img_result['resultName']]['lastObservation'],
                'confidence': detection['confidence']
            }

            gps_coordinates = image_info[img_result['resultName']].get(
                'gpsCoordinates', None)
            if gps_coordinates is not None:
                damage['gpsCoordinates'] = gps_coordinates

            detection_result['roadDamages'].append(damage)

        final_detections_list.append(detection_result)

    return final_detections_list


def create_metadata_dict(detections):
    '''
    Metadata example:
    {
    // possible yolo types: longitudinal cracks D00, transverse cracks D10, mesh cracks D20, pothole D40
    'containedTypes': ['pothole', 'crack'], // we are creating subtypes (take YOLO damage classes)
    'amountOfRecords': 4, // how many road_damages have been found overall?
    'inputDataFormat': 'image/jpeg',
    'outputDataFormat': 'application/json',
    'usedDataOntology': 'github.com/.../roaddamage_ontology.ttl' // take link from example
}
    '''
    contained_types_set = set()
    damage_count = 0
    for damage_list in detections:
        for damage in damage_list['roadDamages']:
            damage_count += 1
            contained_types_set.add(DETECTION_CLASSES[damage['name']])

    metadata = {
        # 'longitudinal crack', 'transverse crack', 'mesh crack', 'pothole'
        'containedTypes': list(contained_types_set),
        # sum of all damage records (all images combined)
        'amountOfRecords': damage_count,
        'inputDataFormat': 'image/jpeg',  # MIME type
        'outputDataFormat': 'application/json',  # MIME type
        'usedDataOntology': 'https://raw.githubusercontent.com/GX4FM-Base-X/semantic-road-damange-detection/main/ontologies-shacl/roaddamage_ontology.ttl?token=GHSAT0AAAAAACMYOZEQX3EXGVTBAFM5V4PMZO53PUQ'
    }

    return metadata


def main():
    print('=== start ===')
    is_local_test = os.environ.get('LOCAL_TEST')
    output_dir = './data/outputs' if is_local_test else '/data/outputs'
    app_dir = os.path.dirname(__file__) if is_local_test else '/usr/src/app'
    yolo_dir = os.path.join(app_dir, 'yolov5')
    weight_dir = os.path.join(app_dir, 'weights', 'last_95.pt')
    
    # Ensure the output directory and the 'result' subdirectory exist
    result_dir = os.path.join(output_dir, 'result')
    os.makedirs(result_dir, exist_ok=True)  # Creates the directory if it does not exist

    # Model
    model = torch.hub.load(
        yolo_dir, 'custom', path=weight_dir, device='cpu', source='local')

    # model.conf = 0.25  # NMS confidence threshold
    # model.iou = 0.45  # NMS IoU threshold
    # model.agnostic = False  # NMS class-agnostic
    # model.multi_label = False  # NMS multiple labels per box
    # model.max_det = 1000  # maximum number of detections per image

    # load valid jpg images
    image_list = load_images()

    # image_paths = ['initial_dataset_coordinates/damage-1.jpg','initial_dataset_coordinates/damage-6.jpg' ]  # or file, Path, URL, PIL, OpenCV, numpy, list
    image_paths = [image_info['path'] for image_info in image_list.values()]

    # Inference
    # TODO Why does 640 not draw boxes but 720 does
    results = model(image_paths, size=720)

    # Log Results
    results.print()

    imgs_save_dir = os.path.join(result_dir, 'images')
    
    # Save images with bounding boxes
    results.save(save_dir=imgs_save_dir)

    # results.pandas().xyxy[0] is a DataFrame
    #      xmin    ymin    xmax   ymax  confidence  class    name
    # 0  749.50   43.50  1148.0  704.5    0.874023      0  person
    # 2  114.75  195.75  1095.0  708.0    0.624512      0  person
    # 3  986.00  304.00  1028.0  420.0    0.286865     27     tie
    # https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html
    # to_dict to_json to_excel to_markdown

    detections = []
    for index in range(len(results.pandas().xyxy)):
        detection_result = {}

        detection_result['roadDamages'] = results.pandas(
        ).xyxy[index].to_dict(orient='records')
        detection_result['resultName'] = results.files[index]
        detections.append(detection_result)

    final_result_list = create_detections_list(image_list, detections)
    metadata_dict = create_metadata_dict(detections)
    

    # write /data/outputs/result/detections.json
    with open(os.path.join(result_dir, 'detections.json'), 'w') as f:
        json.dump(final_result_list, f)
        print('Created detections.json')
        

    # write /data/outputs/result/metadata.json
    with open(os.path.join(result_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata_dict, f)
        print('Created metadata.json')
        

    # zip /data/outputs/result/ and save as /data/outputs/result.zip
    shutil.make_archive(result_dir, 'zip', result_dir)
    print('Created result.zip')
    
    
    # delete /data/outputs/result/ recursively
    shutil.rmtree(result_dir)
    print('deleted /data/outputs/result/')
    
    print('=== finished ===')


main()
