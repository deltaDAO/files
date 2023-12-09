from PIL import Image
import cv2
import pandas as pd
import numpy as np
import tensorflow as tf
import plotly.graph_objects as go
import plotly.express as px
from pathlib import Path
import logging
import sys
import os
import json


logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')

stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setLevel(logging.DEBUG)
stdout_handler.setFormatter(formatter)

file_handler = logging.FileHandler("/data/outputs/algorithm.log")
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)


logger.addHandler(file_handler)
logger.addHandler(stdout_handler)

# to be defined by the user
MODEL_PATH = Path("/app/models/model_v1/model.tflite")
IMAGE_PATH = Path("images")
PROB_THRESHOLD = 0.5

# Set IMAGE_PATH for CtD
DIDS = json.loads(os.getenv("DIDS"))
DID = DIDS[0]
IMAGE_PATH=f'/data/inputs/{DID}'

# depending on the model
CLASSES = ["apple", "banana", "grapes", "mango", "orange", "pear", "strawberry"]


class Model:
    def __init__(self, model_filepath):
        self.interpreter = tf.lite.Interpreter(model_path=str(model_filepath))
        self.interpreter.allocate_tensors()

        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        assert len(self.input_details) == 1 and len(self.output_details) == 3
        self.input_shape = self.input_details[0]['shape'][1:3]

    def predict(self, img):  # image_filepath):
        logger.info('Making detections...')
        # image = PIL.Image.open(image_filepath).resize(self.input_shape)
        image = img.resize(self.input_shape)
        input_array = np.array(image, dtype=np.float32)[np.newaxis, :, :, :]

        self.interpreter.set_tensor(self.input_details[0]['index'], input_array)
        self.interpreter.invoke()

        return {
            detail['name']: self.interpreter.get_tensor(detail['index'])[
                np.newaxis, ...
            ]
            for detail in self.output_details
        }


def geration_bb(
    img: np.array, boxes_start, boxes_end, labels, scores, labels_start, rect_th=3
):
    logger.info("Generating image with annotations...")
    img_width, img_height, _ = img.shape
    for i, score in zip(range(len(boxes_start)), scores):
        start_point = np.asarray(boxes_start[i], dtype=int)
        start_label = np.asarray(labels_start[i], dtype=int)
        end_point = np.asarray(boxes_end[i], dtype=int)

        start_point = (max(start_point[0], rect_th), max(start_point[1], rect_th))
        end_point = (
            min(end_point[0], img_height - rect_th),
            min(end_point[1], img_width - rect_th),
        )
        img = cv2.rectangle(
            img,
            start_point,
            end_point,
            color=(0, 255, 0),
            thickness=rect_th,
        )
        img = cv2.putText(
            img,
            labels[i] + " (" + str(scores[i]) + ")",
            start_label,
            cv2.FONT_HERSHEY_PLAIN,
            1.5,
            (0, 255, 0),
            rect_th - 1,
        )
    return img


def images_with_boxes(img: str, classes, prob, model_obj_dect: Model):
    img = Image.open(img)
    img_array = np.array(img)
    logger.info('Preparing image for testing')
    outputs = model_obj_dect.predict(img)
    assert set(outputs.keys()) == set(
        ['detected_boxes', 'detected_classes', 'detected_scores']
    )

    height, width = img_array.shape[:2]

    labels_pred = []
    scores_pred = []
    labels_start = []
    boxes_start = []
    boxes_end = []

    for box, class_id, score in zip(
        outputs['detected_boxes'][0],
        outputs['detected_classes'][0],
        outputs['detected_scores'][0],
    ):
        if score.round(2) >= prob:
            labels_pred.append(class_id)
            scores_pred.append(score.round(2))
            boxes_start.append((box[0] * width, box[1] * height))
            labels_start.append((box[0] * width + 5, (box[1] * height) + 35))
            boxes_end.append((box[2] * width, box[3] * height))
            # st.write(f"Label: {class_id}, Probability: {score:.5f}, box: ({box[0]*width:.5f}, {box[1]*height:.5f}) ({box[2]*width:.5f}, {box[3]*height:.5f})")

    classes_pred = [classes[i] for i in labels_pred]
    # if len(classes_pred) != 0:
    #     labels = pd.DataFrame(labels)[0]
    # else:
    labels = classes_pred
    box_img = geration_bb(
        img_array, boxes_start, boxes_end, labels, scores_pred, labels_start
    )
    return box_img, classes_pred

def get_real_classes(dic: list):
    real_classes = []
    for i in range(len(dic)):
        if i == 0:
            times = int(dic[i])
        if i % 2!=1:
           times =  int(dic[i])

        else:
            j = 0
            while j < times:
                real_classes.append(dic[i])
                j += 1
    return real_classes

def plotting_stats(df_stats):
    labels = CLASSES
    fig = go.Figure(data=[
                go.Bar(name='Predicted counts', x=labels, y=df_stats['counter_pred']),
                go.Bar(name='Real counts', x=labels, y=df_stats['counter_real'])
            ])
            # Change the bar mode
    fig.update_layout(
    barmode='group',
    bargap=0.15, # gap between bars of adjacent location coordinates.
    bargroupgap=0.1 # gap between bars of the same location coordinate.
)
    fig.update_xaxes(title_text='Fruit')
    fig.update_yaxes(title_text='Appearances')
    fig.update_layout(title_text=f'Evaluated at {PROB_THRESHOLD:.2f} threshold')
    df_stats['labels'] = CLASSES
    fig2 = px.pie(df_stats, values='misclassification_loss', names='labels',title='Missclassification loss',)
    fig2.update_traces(textposition='inside', textinfo='percent+label')
    fig2.update_layout(title_text=f'Evaluated at {PROB_THRESHOLD:.2f} threshold')
    return fig, fig2

def main():
    logger.info(f'Settings: {MODEL_PATH=}, {IMAGE_PATH=}, {PROB_THRESHOLD=}')
    logger.info('Loading the model ... ')
    model_obj_dect = Model(str(MODEL_PATH))
    logger.info('Model ready!')
    df_real = []
    df_pred = []
    images = []

    # No upload of subfolder in CtD
    #if not os.path.exists("/data/outputs/annotations"):
    #    os.mkdir("/data/outputs/annotations")

    for full_path in IMAGE_PATH.glob("*"):
        box_img, classes_pred = images_with_boxes(
            str(full_path), CLASSES, PROB_THRESHOLD, model_obj_dect
        )

        logger.info("Prediction: %s", classes_pred)
        real_classes_dic = str(full_path).replace('/', '_').replace(".jpeg","_").split("_")[1:-1]
        images.append(box_img)

        real_classes = get_real_classes(real_classes_dic)
        for i in range(len(real_classes)):
            df_real.append(real_classes[i])
        for j in range(len(classes_pred)):
            df_pred.append(classes_pred[j])

        print(real_classes,classes_pred)

    for i in range(len(images)):
        cv2.imwrite("/data/outputs/annotations-img"+str(i)+'.png',np.flip(images[i],axis=-1))

    df_classes = pd.DataFrame({'classes': CLASSES})

    df_pred = pd.DataFrame({'classes': df_pred})
    df_real = pd.DataFrame({'classes': df_real})

    df_pred = df_pred.groupby(['classes'])['classes'].count()
    df_real = df_real.groupby(['classes'])['classes'].count()

    df_pred = df_pred.reset_index(name="counter_pred")
    df_real = df_real.reset_index(name="counter_real")

    df_stats = pd.concat([df_classes,df_real,df_pred])
    df_stats['counter_pred'] = df_stats['counter_pred'].fillna(0)
    df_stats['counter_real'] = df_stats['counter_real'].fillna(0)
    df_stats = df_stats.groupby(['classes']).agg({'counter_real':'sum','counter_pred':'sum'}).reset_index()
    df_stats['misclassification_loss'] = abs(df_stats['counter_real']-df_stats['counter_pred'])

    fig1, fig2 = plotting_stats(df_stats)
    
    # No upload of subfolder in CtD
    #if not os.path.exists("/data/outputs/statistics"):
    #    os.mkdir("/data/outputs/statistics")

    fig1.write_image("/data/outputs/statistics-fig1.png")
    fig2.write_image("/data/outputs/statistics-fig2.png")

if __name__ == "__main__":
    main()
